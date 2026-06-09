import { useState } from "react";
import axios from "axios";

function App() {

  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");

  const handleFolderChange = (e) => {

    const selectedFiles = Array.from(
      e.target.files
    );

    setFiles(selectedFiles);
  };

  const testBackend = async () => {

    try {

      const response =
        await axios.get(
          "http://127.0.0.1:8000/"
        );

      setMessage(
        response.data.message
      );

    } catch (error) {

      console.error(error);

      setMessage(
        "Backend Connection Failed"
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
        onClick={testBackend}
        style={{
          padding: "10px 20px",
          cursor: "pointer"
        }}
      >
        Test Backend
      </button>

      <p>
        {message}
      </p>

      <br />
      <br />

      {files.length > 0 && (
        <>
          <h2>Selected Files</h2>

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
                    <td>{index + 1}</td>
                    <td>{file.name}</td>
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