"""Cluster products into price ranges with K-Means.

Run from this folder after installing requirements. The script reads the
existing product API, so it does not expose MySQL directly:

    py -m pip install -r requirements.txt
    $env:CLUSTERING_AUTH_TOKEN = "your_login_token"
    py clustering.py
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


DEFAULT_OUTPUT = Path(__file__).resolve().parent / "cluster_results.json"
DEFAULT_API_URL = "http://119.59.102.161:3012/api/products"


def load_products(api_url: str, token: str) -> pd.DataFrame:
    """Read priced products through the existing authenticated product API."""
    response = requests.get(
        api_url,
        params={"page": 1, "limit": 100},
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    products = pd.DataFrame(payload.get("items", []))
    if products.empty:
        return products
    products["price"] = pd.to_numeric(products.get("price"), errors="coerce")
    return products.loc[products["price"] > 0, ["id", "name", "category", "price"]].copy()


def get_login_token(api_url: str) -> str:
    """Use a supplied token or securely prompt for the existing app login."""
    token = os.getenv("CLUSTERING_AUTH_TOKEN")
    if token:
        return token

    username = input("Username: ").strip()
    password = getpass.getpass("Password: ")
    login_url = api_url.rsplit("/products", 1)[0] + "/auth/login"
    response = requests.post(
        login_url,
        json={"username": username, "password": password},
        timeout=15,
    )
    response.raise_for_status()
    token = response.json().get("token")
    if not token:
        raise ValueError("Login succeeded but did not return an authentication token.")
    return token


def cluster_products(products: pd.DataFrame, requested_clusters: int) -> tuple[pd.DataFrame, list[dict]]:
    """Assign each product to low, medium, or high price clusters."""
    if len(products) < 2:
        raise ValueError("At least two products with a price greater than 0 are required.")

    cluster_count = min(requested_clusters, len(products))
    values = products[["price"]].astype(float)
    scaled_values = StandardScaler().fit_transform(values)
    model = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
    products = products.copy()
    products["raw_cluster"] = model.fit_predict(scaled_values)

    # K-Means labels are arbitrary. Sort its centers so labels stay meaningful.
    ordered_clusters = sorted(
        range(cluster_count), key=lambda index: float(model.cluster_centers_[index][0])
    )
    label_names = ["low", "medium", "high"]
    cluster_labels = {
        raw_cluster: label_names[min(position, len(label_names) - 1)]
        for position, raw_cluster in enumerate(ordered_clusters)
    }
    products["cluster"] = products["raw_cluster"].map(cluster_labels)

    summaries = []
    for raw_cluster in ordered_clusters:
        group = products[products["raw_cluster"] == raw_cluster]
        summaries.append(
            {
                "cluster": cluster_labels[raw_cluster],
                "product_count": int(len(group)),
                "average_price": round(float(group["price"].mean()), 2),
                "min_price": float(group["price"].min()),
                "max_price": float(group["price"].max()),
            }
        )
    return products.drop(columns=["raw_cluster"]), summaries


def main() -> None:
    parser = argparse.ArgumentParser(description="Cluster products by price.")
    parser.add_argument("--clusters", type=int, default=3, help="Maximum number of price groups.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Result JSON path.")
    parser.add_argument(
        "--api-url",
        default=os.getenv("CLUSTERING_API_URL", DEFAULT_API_URL),
        help="Authenticated products endpoint.",
    )
    args = parser.parse_args()

    if args.clusters < 2:
        raise ValueError("--clusters must be at least 2.")

    products = load_products(args.api_url, get_login_token(args.api_url))
    clustered, summaries = cluster_products(products, args.clusters)
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "feature": "price",
        "cluster_count": len(summaries),
        "clusters": summaries,
        "products": clustered.to_dict(orient="records"),
    }

    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Clustered {len(clustered)} products by price.")
    print(f"Saved results to {args.output}")


if __name__ == "__main__":
    main()
