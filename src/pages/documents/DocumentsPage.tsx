import React, { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Download, Trash2, Share2, PenTool } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

interface Doc {
  _id: string;
  name: string;
  type: string;
  size: string;
  fileUrl: string;
  owner: { _id: string; name: string; avatarUrl: string };
  sharedWith: string[];
  status: 'draft' | 'pending_signature' | 'signed';
  createdAt: string;
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingDoc, setSigningDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('nexus_token');

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDocuments(data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      toast.success('Document uploaded!');
      fetchDocs();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Document deleted');
      fetchDocs();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSign = async (id: string) => {
    try {
      const signature = `Signed by user on ${new Date().toLocaleString()}`;
      const res = await fetch(`${API_URL}/documents/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signature })
      });
      if (!res.ok) throw new Error('Failed to sign');
      toast.success('Document signed!');
      setSigningDoc(null);
      fetchDocs();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const statusColor: Record<string, 'default' | 'secondary' | 'warning' | 'success'> = {
    draft: 'default', pending_signature: 'warning', signed: 'success'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
        <Button leftIcon={<Upload size={18} />} onClick={() => fileInputRef.current?.click()}>
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Overview</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Documents</span>
                <span className="font-medium text-gray-900">{documents.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Signed</span>
                <span className="font-medium text-gray-900">{documents.filter(d => d.status === 'signed').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending Signature</span>
                <span className="font-medium text-gray-900">{documents.filter(d => d.status === 'pending_signature').length}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No documents yet. Upload your first file!</p>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc._id} className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                      <div className="p-2 bg-primary-50 rounded-lg mr-4">
                        <FileText size={24} className="text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                          <Badge variant={statusColor[doc.status]} size="sm">{doc.status.replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{doc.type}</span>
                          <span>{doc.size}</span>
                          <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                          <span>by {doc.owner?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <a href={`${BASE_URL}${doc.fileUrl}`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="p-2" aria-label="Download">
                            <Download size={18} />
                          </Button>
                        </a>

                        {doc.status !== 'signed' && (
                          <Button variant="ghost" size="sm" className="p-2" aria-label="Sign"
                            onClick={() => handleSign(doc._id)}>
                            <PenTool size={18} />
                          </Button>
                        )}

                        <Button variant="ghost" size="sm" className="p-2 text-error-600 hover:text-error-700"
                          aria-label="Delete" onClick={() => handleDelete(doc._id)}>
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
