import { useEffect, useState, useRef } from 'react';
import EditCampaignModal from './EditCampaignModal';
import EditIcon from '@mui/icons-material/Edit';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { toast, ToastContainer } from 'react-toastify';
import { memo } from "react";
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {

  const [campaigns, setCampaigns] = useState([]);
  const [filters, setFilters] = useState({ id: '', name: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 100, totalPages: 1 });

  const fileInputRef = useRef(null);
  const [uploadCampaignId, setUploadCampaignId] = useState(null);

  const clearFilters = () => setFilters({ id: '', name: '', status: '' });
  const [editModal, setEditModal] = useState({ visible: false, campaign: null });
  const [favorites, setFavorites] = useState({});

  const fetchCampaigns = async () => {
    const params = new URLSearchParams();
    if (filters.id) params.append('id', filters.id);
    if (filters.name) params.append('name', filters.name);
    if (filters.status) params.append('status', filters.status);
    params.append('page', pagination.page);
    params.append('limit', pagination.limit);

    const qs = params.toString();
    const url = '/api/campaigns' + (qs ? `?${qs}` : '');
    try {
      const res = await fetch(url);
      const response = await res.json();
      if (response.success) {
        setPagination(p => {
          const tot = response.meta.totalPages || 1;
          const current = p.page > tot ? 1 : p.page;
          return { ...p, page: current, totalPages: tot };
        });
        const campaignsWithCreatives = await Promise.all(
          response.data.map(async c => {
            try {
              const res = await fetch(`/api/campaigns/${c.id}/creatives`);
              const creativesResp = await res.json();
              return { ...c, creatives: creativesResp.creatives || [] };
            } catch {
              return { ...c, creatives: [] };
            }
          })
        );
        setCampaigns(campaignsWithCreatives);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filters, pagination.page, pagination.limit]);


  const handleAddCreativeClick = id => {
    setUploadCampaignId(id);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async e => {
    const file = e.target.files[0];
    if (!file || !uploadCampaignId) return;
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`/api/campaigns/${uploadCampaignId}/creatives`, {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      if (res.ok) {
        fetchCampaigns();
        toast.success('Creative uploaded successfully');
      } else {
        toast.error('Upload failed: ' + (data.error || data.message));
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };


  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('favorites') || '{}');
      setFavorites(stored);
    } catch (e) {
      console.error('failed parsing favorites', e);
    }
  }, []);

  const toggleFavorite = id => {
    setFavorites(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem('favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const openEditModal = campaign => {
    setEditModal({ visible: true, campaign: { ...campaign } });
  };

  const closeEditModal = () => {
    setEditModal({ visible: false, campaign: null });
  };

  const saveEdit = async () => {
    const cam = editModal.campaign;
    const body = {
      id: cam.id,
      name: cam.name,
      imageUrl: cam.imageUrl,
      landingUrl: cam.landingUrl,
      status: cam.status
    };
    try {
      const res = await fetch(`/api/campaigns/${cam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Campaign updated');
        fetchCampaigns();
        closeEditModal();
      } else {
        toast.error('Error: ' + (data.error || data.message));
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  return (
    <div className="app-container">
      <h1>Campaigns</h1>
      <ToastContainer />
      <div className="filters">
        <TextField
          label="ID"
          name="id"
          value={filters.id}
          onChange={handleChange}
          variant="outlined"
          size="small"
          className="filter-field"
        />
        <TextField
          label="Name"
          name="name"
          value={filters.name}
          onChange={handleChange}
          variant="outlined"
          size="small"
          className="filter-field"
        />
        <TextField
          label="Status"
          name="status"
          select
          value={filters.status}
          onChange={handleChange}
          variant="outlined"
          size="small"
          className="filter-status"
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="1">Active</MenuItem>
          <MenuItem value="0">Paused</MenuItem>
        </TextField>
        <Button variant="outlined" size="small" onClick={clearFilters}>
          Clear
        </Button>
      </div>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <ul className="card-list">
        {campaigns.map(c => (
          <li key={c.id} className="card-item">
            <Paper elevation={2} className="card-content">
              <img
                src={c.imageUrl} 
                alt={c.name}
              />
              <div className="card-info">
                <Typography variant="" component="div" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  {c.name}
                </Typography>
                <Typography variant="body2">
                  <a
                    href={c.landingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visita ${c.landingUrl}`}
                  >
                    {c.landingUrl}
                  </a>
                </Typography>
              </div>
              <div className="card-status">
                <Typography variant="body2">
                  {c.status === '1' ? 'Active' : 'Paused'}
                </Typography>
              </div>
              <div className="card-actions">
                <button
                  onClick={() => openEditModal(c)}
                  className="edit-button"
                  title="Edit campaign"
                  aria-label={`Modifica campagna ${c.name}`}
                >
                  <EditIcon fontSize="small" />
                </button>
                <button
                  onClick={() => toggleFavorite(c.id)}
                  className="favorite-button"
                  title="Toggle favorite"
                  aria-label={favorites[c.id] ? `Rimuovi dai preferiti ${c.name}` : `Aggiungi ai preferiti ${c.name}`}
                >
                  {favorites[c.id] ? (
                    <FavoriteIcon fontSize="small" color="error" />
                  ) : (
                    <FavoriteBorderIcon fontSize="small" />
                  )}
                </button>
              </div>
              <div className="card-campaign-info">
                <Button
                  size="small"
                  variant="outlined"
                  className="add-creative-button"
                  aria-label={`Add creative to ${c.name}`}
                  onClick={() => handleAddCreativeClick(c.id)}
                >
                  Add creative
                </Button>
              </div>
              {c.creatives && c.creatives.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {c.creatives.map(creative => (
                    <div key={creative.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img
                        src={creative.url}
                        alt={creative.originalName ? `Creative: ${creative.originalName}` : 'Immagine creativa'}
                        style={{ width: 48, height: 72, objectFit: 'cover', border: '1px solid #ccc', borderRadius: 4 }}
                      />
                      <span style={{ fontSize: 10 }}>{creative.filename}</span>
                        <a
                        href={creative.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 10 }}
                        aria-label={creative.originalName ? `Visualizza immagine ${creative.originalName}` : 'Visualizza immagine creativa'}
                        >
                          visualizza l'immagine
                        </a>
                    </div>
                  ))}
                </div>
              )}
            </Paper>
          </li>
        ))}
      </ul>

      <EditCampaignModal
        visible={editModal.visible}
        campaign={editModal.campaign}
        onChange={(field, value) =>
          setEditModal(m => ({
            ...m,
            campaign: { ...m.campaign, [field]: value }
          }))
        }
        onSave={saveEdit}
        onCancel={closeEditModal}
      />

      <div className="pagination">
        <Button
          aria-label="Previous page"
          onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
          disabled={pagination.page <= 1}
        >
          {"<<"}
        </Button>
        <Typography style={{ margin: '0 12px' }}>
          Page {pagination.page} of {pagination.totalPages}
        </Typography>
        <Button
          aria-label="Next page"
          onClick={() =>
            setPagination(p => ({
              ...p,
              page: Math.min(p.totalPages, p.page + 1)
            }))
          }
          disabled={pagination.page >= pagination.totalPages}
        >
          {">>"}
        </Button>
      </div>
    </div>
  );
}

export default memo(App);
