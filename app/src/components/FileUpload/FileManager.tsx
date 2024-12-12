// src/components/FileUpload/FileManager.tsx
import { useState, useEffect } from 'react';
import { uploadFile, listFiles, deleteFile, getSignedDownloadUrl } from '@/utils/s3';

interface FileItem {
  Key?: string;
  LastModified?: Date;
  Size?: number;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const fileList = await listFiles();
      setFiles(fileList);
    } catch (err) {
      setError('Failed to load files');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await uploadFile(file);
      await loadFiles();
      setSuccess('File uploaded successfully');
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteFile(key);
      await loadFiles();
      setSuccess('File deleted successfully');
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const handleDownload = async (key: string) => {
    try {
      const url = await getSignedDownloadUrl(key);
      window.open(url, '_blank');
    } catch (err) {
      setError('Failed to download file');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Upload File</label>
        <div className="mt-1 flex items-center">
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 text-green-700 bg-green-100 rounded-md">
          {success}
        </div>
      )}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">File Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Size</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Modified</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {files.map((file) => (
              <tr key={file.Key}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {file.Key}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatBytes(file.Size)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {file.LastModified?.toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => file.Key && handleDownload(file.Key)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => file.Key && handleDelete(file.Key)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}