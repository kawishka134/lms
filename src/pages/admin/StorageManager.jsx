import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  HardDrive, Trash2, FileText, Image as ImageIcon, 
  AlertTriangle, RefreshCw, Layers, CheckCircle, 
  Search, ExternalLink, Database, Activity
} from 'lucide-react';
import { useToast } from '../../components/Toast';

export default function StorageManager() {
    const { showToast } = useToast();
    const [buckets, setBuckets] = useState([]);
    const [selectedBucket, setSelectedBucket] = useState('mcq_papers');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState({ used: 0, total: 1024 * 1024 * 1024 }); // 1GB
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedPaths, setSelectedPaths] = useState([]);

    const BUCKET_LIST = ['mcq_papers', 'payment_slips', 'tute_slips', 'promo_videos', 'site-media'];

    const fetchStorageData = async () => {
        setLoading(true);
        setSelectedPaths([]); // Reset selection on refresh
        try {
            let totalBytes = 0;
            const bucketStats = {};

            const listAllFiles = async (bucket, path = '') => {
                const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 100 });
                if (error) return [];
                
                let files = [];
                for (const item of data) {
                    if (item.id) { // Only files have an ID, folders don't
                        files.push({ ...item, bucket, fullPath: path ? `${path}/${item.name}` : item.name });
                    } else {
                        // It's a folder
                        const subFiles = await listAllFiles(bucket, path ? `${path}/${item.name}` : item.name);
                        files = [...files, ...subFiles];
                    }
                }
                return files;
            };

            for (const bName of BUCKET_LIST) {
                const allFiles = await listAllFiles(bName);
                const bucketSize = allFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
                totalBytes += bucketSize;
                bucketStats[bName] = { 
                    count: allFiles.length, 
                    size: bucketSize,
                    files: allFiles
                };
            }

            setUsage(prev => ({ ...prev, used: totalBytes }));
            setBuckets(bucketStats);
            setFiles(bucketStats[selectedBucket]?.files || []);
        } catch (e) {
            console.error("Storage Fetch Error:", e);
            showToast("Failed to fetch storage data.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStorageData();
    }, []);

    useEffect(() => {
        if (buckets[selectedBucket]) {
            setFiles(buckets[selectedBucket].files);
            setSelectedPaths([]); // Clear selection when bucket changes
        } else {
            setFiles([]);
        }
    }, [selectedBucket, buckets]);

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const toggleSelect = (path) => {
        setSelectedPaths(prev => 
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const toggleSelectAll = () => {
        if (selectedPaths.length === filteredFiles.length) {
            setSelectedPaths([]);
        } else {
            setSelectedPaths(filteredFiles.map(f => f.fullPath));
        }
    };

    const handleDelete = async (file) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${file.name}"?`)) return;

        setIsDeleting(true);
        try {
            // 1. Storage Removal
            const { data, error: storageError } = await supabase.storage.from(selectedBucket).remove([file.fullPath]);
            if (storageError) throw storageError;

            if (!data || data.length === 0) {
                throw new Error("File could not be removed. It might be already deleted.");
            }

            // 2. Clear DB References
            await clearDbReferences(selectedBucket, [file.name]);

            showToast("File deleted and references cleared.", "success");
            
            // Local update instead of complete refresh
            setFiles(prev => prev.filter(f => f.fullPath !== file.fullPath));
            setBuckets(prev => ({
                ...prev,
                [selectedBucket]: {
                    ...prev[selectedBucket],
                    count: prev[selectedBucket].count - 1,
                    size: prev[selectedBucket].size - (file.metadata?.size || 0)
                }
            }));
            setUsage(u => ({ ...u, used: u.used - (file.metadata?.size || 0) }));

        } catch (err) {
            console.error(err);
            showToast("Delete failed: " + err.message, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedPaths.length;
        if (!window.confirm(`Are you sure you want to delete ${count} selected items?`)) return;

        setIsDeleting(true);
        try {
            const { data, error } = await supabase.storage.from(selectedBucket).remove(selectedPaths);
            if (error) throw error;

            if (data && data.length > 0) {
                // Get filenames for DB cleanup
                const filenames = data.map(item => (item.name || "").split('/').pop());
                await clearDbReferences(selectedBucket, filenames);

                showToast(`Successfully deleted ${data.length} items.`, "success");
                
                // Update Local State
                setFiles(prev => prev.filter(f => !selectedPaths.includes(f.fullPath)));
                setSelectedPaths([]);
                
                // Refresh full data to keep counts accurate
                setTimeout(fetchStorageData, 1000);
            }
        } catch (err) {
            showToast("Bulk delete failed: " + err.message, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const clearDbReferences = async (bucket, filenames) => {
        // Shared logic to clear links in DB
        for (const name of filenames) {
            if (bucket === 'payment_slips') {
                const { data: enrollments } = await supabase.from('enrollments').select('id, slip_url');
                const target = enrollments?.find(e => e.slip_url?.includes(name));
                if (target) await supabase.from('enrollments').update({ slip_url: null, updated_at: new Date().toISOString() }).eq('id', target.id);
            } 
            else if (bucket === 'tute_slips') {
                const { data: tuteEnrolls } = await supabase.from('tute_enrollments').select('id, slip_url');
                const target = tuteEnrolls?.find(e => e.slip_url?.includes(name));
                if (target) await supabase.from('tute_enrollments').update({ slip_url: null }).eq('id', target.id);
            }
            else if (bucket === 'promo_videos') {
                const { data: courses } = await supabase.from('courses').select('id, promo_video_url');
                const target = courses?.find(c => c.promo_video_url?.includes(name));
                if (target) await supabase.from('courses').update({ promo_video_url: null }).eq('id', target.id);
            }
            else if (bucket === 'site-media') {
                const { data: courses } = await supabase.from('courses').select('id, thumbnail_url');
                const targetCourse = courses?.find(c => c.thumbnail_url?.includes(name));
                if (targetCourse) await supabase.from('courses').update({ thumbnail_url: null }).eq('id', targetCourse.id);
                
                const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 'global').single();
                if (settings) {
                    let update = {};
                    if (settings.hero_image_url?.includes(name)) update.hero_image_url = null;
                    if (settings.teacher_photo_url?.includes(name)) update.teacher_photo_url = null;
                    if (settings.intro_video_url?.includes(name)) update.intro_video_url = null;
                    if (Object.keys(update).length > 0) await supabase.from('site_settings').update(update).eq('id', 'global');
                }
            }
        }
    };

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const usagePercent = Math.min(((usage.used / usage.total) * 100), 100);

    return (
        <div style={{ padding: '1rem', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontWeight: 900, fontSize: '2.2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Database size={36} /> Storage Manager
                    </h1>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontWeight: 600 }}>Manage your 1GB free Supabase storage limit</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedPaths.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            style={{ 
                                background: '#ef4444', 
                                color: 'white', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '0.6rem 1.2rem', 
                                border: 'none', 
                                borderRadius: '12px', 
                                cursor: 'pointer', 
                                fontWeight: 800, 
                                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trash2 size={18} /> Delete Selected ({selectedPaths.length})
                        </button>
                    )}
                    <button 
                        onClick={fetchStorageData} 
                        disabled={loading}
                        className="btn btn-outline" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem' }}
                    >
                        <RefreshCw size={18} className={loading ? 'typing-spin' : ''} /> Refresh Data
                    </button>
                </div>
            </div>

            {/* Usage Overview Card */}
            <div className="card glass shimmer" style={{ padding: '2rem', marginBottom: '2.5rem', border: '1px solid var(--color-primary-light)', background: 'linear-gradient(135deg, #fff 0%, #fff9fa 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                    <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Usage</span>
                        <h2 style={{ fontSize: '2.5rem', margin: '0.2rem 0', fontWeight: 900 }}>{formatSize(usage.used)} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>of {formatSize(usage.total)}</span></h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: usagePercent > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }}>{usagePercent.toFixed(1)}%</span>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Capacity Used</p>
                    </div>
                </div>
                <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ 
                        width: `${usagePercent}%`, 
                        height: '100%', 
                        background: usagePercent > 80 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, var(--color-primary), #fb7185)',
                        borderRadius: '10px',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                </div>
                {usagePercent > 85 && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b' }}>
                        <AlertTriangle size={20} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Warning: You are approaching the 1GB free storage limit. Please delete old payment slips to free up space.</span>
                    </div>
                )}
            </div>

            {/* Main Management Interface */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Bucket Tabs */}
                <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px' }}>
                    {BUCKET_LIST.map(b => (
                        <button 
                            key={b}
                            onClick={() => setSelectedBucket(b)}
                            style={{ 
                                padding: '1rem 1.5rem',
                                border: 'none',
                                borderBottom: selectedBucket === b ? '3px solid var(--color-primary)' : '3px solid transparent',
                                background: 'transparent',
                                color: selectedBucket === b ? 'var(--color-primary)' : '#64748b',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <HardDrive size={18} />
                            {b.replace(/_/g, ' ').toUpperCase()}
                            <span style={{ fontSize: '0.7rem', background: selectedBucket === b ? 'var(--color-primary-light)' : '#f1f5f9', padding: '2px 8px', borderRadius: '20px' }}>
                                {buckets[b]?.count || 0}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search & Actions */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                        <input 
                            type="text" 
                            placeholder="Search files by name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '0.8rem 1rem 0.8rem 3rem', 
                                borderRadius: '14px', 
                                border: '1px solid #e2e8f0',
                                fontSize: '0.9rem',
                                fontWeight: 600
                            }}
                        />
                    </div>
                </div>

                {/* File List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '1.25rem', width: '50px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={filteredFiles.length > 0 && selectedPaths.length === filteredFiles.length}
                                            onChange={toggleSelectAll}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>FILE INFO</th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>SIZE</th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>DATE ADDED</th>
                                    <th style={{ padding: '1.25rem', fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '4rem', textAlign: 'center' }}>
                                            <Activity className="typing-spin" size={32} color="var(--color-primary)" />
                                            <p style={{ marginTop: '1rem', fontWeight: 700, color: '#94a3b8' }}>Scanning bucket contents...</p>
                                        </td>
                                    </tr>
                                ) : filteredFiles.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                                            <div style={{ marginBottom: '1rem' }}><AlertTriangle size={48} /></div>
                                            <p style={{ fontWeight: 800 }}>No files found here.</p>
                                        </td>
                                    </tr>
                                ) : filteredFiles.map((file, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', backgroundColor: selectedPaths.includes(file.fullPath) ? '#fdf2f4' : 'transparent' }}>
                                        <td style={{ padding: '1.25rem' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPaths.includes(file.fullPath)}
                                                onChange={() => toggleSelect(file.fullPath)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ 
                                                    width: '45px', 
                                                    height: '45px', 
                                                    backgroundColor: '#f1f5f9', 
                                                    borderRadius: '10px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    overflow: 'hidden'
                                                }}>
                                                    {file.metadata?.mimetype?.startsWith('image/') ? (
                                                        <ImageIcon size={20} color="#94a3b8" />
                                                    ) : (
                                                        <FileText size={20} color="#94a3b8" />
                                                    )}
                                                </div>
                                                <div style={{ maxWidth: '300px' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>{file.metadata?.mimetype || 'Unknown File'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{formatSize(file.metadata?.size || 0)}</span>
                                        </td>
                                        <td style={{ padding: '1.25rem' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{new Date(file.created_at).toLocaleDateString()}</span>
                                        </td>
                                        <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <a 
                                                    href={supabase.storage.from(selectedBucket).getPublicUrl(file.fullPath).data.publicUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="btn-icon" 
                                                    style={{ color: '#0ea5e9', backgroundColor: '#f0f9ff', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                                <button 
                                                    onClick={() => handleDelete(file)}
                                                    disabled={isDeleting}
                                                    className="btn-icon" 
                                                    style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .btn-icon:hover {
                    opacity: 0.8;
                    transform: scale(1.05);
                }
            `}</style>
        </div>
    );
}
