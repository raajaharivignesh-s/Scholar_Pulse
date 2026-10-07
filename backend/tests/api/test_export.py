def test_export_markdown(client):
    response = client.get("/api/projects/1/export/markdown")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert "attachment; filename=" in response.headers["content-disposition"]
    text = response.text
    assert "# Executive Research Report:" in text
    assert "Paper Inventory" in text
    assert "Multi-Paper Comparison Matrix" in text

def test_export_bibtex(client):
    response = client.get("/api/projects/1/export/bibtex")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert ".bib" in response.headers["content-disposition"]
    text = response.text
    assert "@article{" in text
    assert "title =" in text
    assert "author =" in text
