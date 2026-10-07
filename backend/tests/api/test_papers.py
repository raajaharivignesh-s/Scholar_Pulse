import io

def test_upload_valid_pdf(client):
    file_content = b"%PDF-1.4\n%EOF"
    response = client.post(
        "/api/projects/1/papers",
        files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "test.pdf"
    assert data["status"] in ["QUEUED", "PROCESSING", "PROCESSED", "UPLOADED", "FAILED_EXTRACTION", "FAILED"]
    assert "file_path" in data


def test_upload_invalid_file_extension(client):
    file_content = b"Not a PDF"
    response = client.post(
        "/api/projects/1/papers",
        files={"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
    )
    assert response.status_code == 400
    assert "Only PDF files are supported" in response.text


def test_upload_oversized_file(client):
    # 51 MB file
    file_content = b"0" * (51 * 1024 * 1024)
    response = client.post(
        "/api/projects/1/papers",
        files={"file": ("large.pdf", io.BytesIO(file_content), "application/pdf")}
    )
    assert response.status_code == 413
    assert "too large" in response.text


def test_upload_wrong_project(client):
    # Project 2 belongs to user 2, but current user is user 1
    file_content = b"%PDF-1.4\n%EOF"
    response = client.post(
        "/api/projects/2/papers",
        files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
    )
    assert response.status_code == 404
    assert "not found or unauthorized" in response.text


def test_duplicate_upload(client):
    file_content = b"%PDF-1.4\nsome content\n%EOF"
    # First upload
    res1 = client.post(
        "/api/projects/1/papers",
        files={"file": ("test1.pdf", io.BytesIO(file_content), "application/pdf")}
    )
    assert res1.status_code == 200

    # Second upload with same content
    res2 = client.post(
        "/api/projects/1/papers",
        files={"file": ("test2.pdf", io.BytesIO(file_content), "application/pdf")}
    )
    assert res2.status_code == 400
    assert "already uploaded" in res2.text


def test_list_papers_with_filters(client):
    res = client.get("/api/projects/1/papers?status=ALL&search=test&year_min=2000&year_max=2030")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

