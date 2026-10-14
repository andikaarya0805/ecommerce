import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';

export const AdminPanel: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, [user, navigate]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSample = async () => {
    try {
      const newProduct = {
        name: 'New Product Test',
        category: 'cvt',
        price: 50000,
        stock: 10
      };
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        window.location.reload(); // Quick refresh to see new product
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-carbon text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-racing font-bold uppercase text-[#E50914]">Admin Dashboard</h1>
          <div className="flex gap-4">
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-neutral-800 rounded">Kembali ke Toko</button>
            <button onClick={logout} className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white">Logout</button>
          </div>
        </div>

        <div className="mb-4">
          <button onClick={handleAddSample} className="px-4 py-2 bg-emerald-600 rounded font-bold">+ Tambah Produk Test</button>
        </div>

        <div className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="p-4">Nama Produk</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Harga</th>
                <th className="p-4">Stok</th>
                <th className="p-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-neutral-800 hover:bg-neutral-900/50">
                  <td className="p-4">{p.name}</td>
                  <td className="p-4">{p.category}</td>
                  <td className="p-4">Rp {p.price.toLocaleString('id-ID')}</td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleDelete(p.id)} className="px-3 py-1 bg-red-900/40 text-red-400 rounded hover:bg-red-500 hover:text-white">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
