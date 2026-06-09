import { useState } from "react";
import axios from "axios";

function App() {

  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState([]);

  const handleFolderChange = (e) => {

    const selectedFiles = Array.from(
      e.target.files
    );

    setFiles(selectedFiles);
  };

  const classifyDocuments = async () => {

    try {

      const formData = new FormData();

      files.forEach((file) => {

        formData.append(
          "files",
          file
        );

      });

      const response =
        await axios.post(
          "http://127.0.0.1:8000/classify",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data"
            }
          }
        );

      setMessage(
      `Successfully classified ${response.data.length} files`
    );

      setResults(
        response.data
      );

    } catch (error) {

      console.error(error);

      setMessage(
        "Classification Failed"
      );
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial"
      }}
    >
      <h1>
        AI Document Classification System
      </h1>

      <br />

      <input
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderChange}
      />

      <br />
      <br />

      <h3>
        Total Files Selected:
        {" "}
        {files.length}
      </h3>

      <button
        onClick={classifyDocuments}
        style={{
          padding: "10px 20px",
          cursor: "pointer"
        }}
      >
        Classify Documents
      </button>

      <br />
      <br />

      <p>
        {message}
      </p>

      {results.length > 0 && (
        <>
          <h2>
            Files Received By Backend
          </h2>

          <table
            border="1"
            cellPadding="8"
            style={{
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Filename</th>
                <th>Prediction</th>
                <th>Confidence</th>
              </tr>
            </thead>

            <tbody>

              {results.map(
                (file, index) => (
                  <tr key={index}>
                    <td>
                      {index + 1}
                    </td>

                    <td>{file.filename}</td>
                    <td>{file.prediction}</td>
                    <td>{file.confidence}%</td>
                  </tr>
                )
              )}

            </tbody>
          </table>
        </>
      )}

      <br />
      <br />

      {files.length > 0 && (
        <>
          <h2>
            Selected Files
          </h2>

          <table
            border="1"
            cellPadding="8"
            style={{
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Filename</th>
              </tr>
            </thead>

            <tbody>

              {files.map(
                (file, index) => (
                  <tr key={index}>
                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {file.name}
                    </td>
                  </tr>
                )
              )}

            </tbody>
          </table>
        </>
      )}

    </div>
  );
}

export default App;