/**
 * Read the content of a file
 * @param {File} file - The file to read
 * @returns {Promise<string>} - A promise that resolves with the file content
 */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
}