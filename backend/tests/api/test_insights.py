def test_get_analytics(client):
    response = client.get("/api/projects/1/analytics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_papers"] == 2
    assert data["processed_papers"] == 2
    assert data["status_breakdown"]["PROCESSED"] == 2
    assert "2017" in data["year_distribution"]
    assert "2019" in data["year_distribution"]


def test_get_insights(client):
    response = client.get("/api/projects/1/insights")
    assert response.status_code == 200
    data = response.json()
    assert "overview" in data
    assert len(data["core_themes"]) > 0
    assert len(data["methodologies"]) > 0


def test_get_reading_priority(client):
    response = client.get("/api/projects/1/reading-priority")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert "priority_score" in data[0]
    assert data[0]["priority_score"] >= data[1]["priority_score"]


def test_compare_papers(client):
    response = client.post("/api/projects/1/compare", json={"paper_ids": [101, 102]})
    assert response.status_code == 200
    data = response.json()
    assert "matrix" in data
    assert len(data["matrix"]) == 2
    assert data["matrix"][0]["paper_id"] in [101, 102]


def test_get_citations(client):
    response = client.get("/api/projects/1/citations")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) == 2
