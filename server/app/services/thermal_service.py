import subprocess, json, os, tempfile

def process_bmt_file(bmt_path: str):
    CSHARP_APP = r"D:\پروژه های دانش بنیان\termo2\termo\BmtExtract\BmtExtract\bin\Debug\net8.0\BmtExtract.exe"
    output_dir = tempfile.mkdtemp()

    process = subprocess.run(
        [CSHARP_APP, bmt_path, output_dir],
        capture_output=True,
        text=True
    )

    if process.returncode != 0:
        raise RuntimeError(process.stderr)

    json_path = os.path.join(output_dir, "data.json")
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)
