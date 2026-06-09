import { useState, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSuccess: (msg: string, type: 'ok' | 'err') => void;
}

export function CreateFileForm({ onSuccess }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [maxViews, setMaxViews] = useState('');
  const [password, setPassword] = useState('');
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrls, setShareUrls] = useState<string[]>([]);
  const [collectionUrl, setCollectionUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { accessToken } = useAuth();

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunks.current = [];
    recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
      const audioFile = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      setFiles(prev => [...prev, audioFile]);
      stream.getTracks().forEach(t => t.stop());
    };
    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (files.length === 0) return onSuccess('оберіть хоча б один файл', 'err');
    setLoading(true);
    try {
      const hashes: string[] = [];
      const urls: string[] = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('ttlMinutes', String(ttlMinutes));
        if (maxViews) fd.append('maxViews', maxViews);
        if (password) fd.append('password', password);
        fd.append('burnAfterRead', String(burnAfterRead));
        const block = await api.createFileBlock(fd, accessToken ?? undefined);
        hashes.push(block.hash);
        urls.push(`${window.location.origin}/view/${block.hash}`);
      }

      setShareUrls(urls);

      // якщо кілька файлів — створити колекцію
      if (hashes.length > 1) {
        const res = await fetch('http://localhost:3001/api/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            title: `Колекція ${new Date().toLocaleString('uk-UA')}`,
            ttlMinutes,
            blockHashes: hashes,
          }),
        });
        if (res.ok) {
          const col = await res.json();
          setCollectionUrl(`${window.location.origin}/collection/${col.hash}`);
        }
      }

      onSuccess(`Завантажено ${files.length} файл(ів)`, 'ok');
    } catch (e) {
      onSuccess((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p style={titleStyle}>Завантажити файли</p>
      <div style={{ display: 'grid', gap: 14 }}>

        {/* Dropzone */}
        <div>
          <label style={labelStyle}>Файли * (макс. 50MB кожен)</label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '1.5px dashed var(--gray-300)',
              borderRadius: 10, padding: '24px 16px', cursor: 'pointer', textAlign: 'center',
              background: 'var(--gray-50)', transition: 'all 0.15s',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>
              Натисни щоб обрати файли або перетягни сюди
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>
              Можна обрати кілька файлів одночасно
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Список обраних файлів */}
        {files.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                <span style={{ fontSize: 13, color: 'var(--gray-700)' }}>
                  {f.type.startsWith('audio') ? '🎤' : f.type.startsWith('image') ? '🖼' : f.type.startsWith('video') ? '🎬' : '📎'} {f.name}
                  <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>({(f.size / 1024).toFixed(1)} KB)</span>
                </span>
                <button
                  onClick={() => removeFile(i)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Запис голосу */}
        <div style={{ display: 'flex', gap: 8 }}>
          {!recording ? (
            <button type="button" onClick={startRecording} style={{ ...btnStyle, background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }}>
              🎤 Записати голос
            </button>
          ) : (
            <button type="button" onClick={stopRecording} style={{ ...btnStyle, background: '#ef4444', color: 'white' }}>
              ⏹ Зупинити запис
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>TTL (хвилини)</label>
            <input type="number" value={ttlMinutes} min={1} onChange={e => setTtlMinutes(Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Макс. переглядів</label>
            <input type="number" value={maxViews} min={1} placeholder="необмежено" onChange={e => setMaxViews(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Пароль (опціонально)</label>
          <input type="password" value={password} placeholder="••••••" onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="bar-file" checked={burnAfterRead} onChange={e => setBurnAfterRead(e.target.checked)} style={{ cursor: 'pointer' }} />
          <label htmlFor="bar-file" style={{ fontSize: 13, color: 'var(--gray-700)', cursor: 'pointer' }}>Видалити після першого перегляду</label>
        </div>
        <button onClick={submit} disabled={loading || files.length === 0} style={btnStyle}>
          {loading ? `Завантаження ${files.length} файл(ів)...` : `Завантажити ${files.length > 0 ? files.length + ' файл(ів)' : ''}`}
        </button>
      </div>

      {/* Результат — колекція */}
      {collectionUrl && (
        <div style={resultBox}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#065f46', margin: '0 0 8px' }}>
            📁 Колекція з {shareUrls.length} файлів:
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={collectionUrl} readOnly style={{ ...inputStyle, flex: 1, background: 'white' }} />
            <button onClick={() => copy(collectionUrl)} style={copyBtnStyle}>
              {copied ? '✓' : 'Копіювати'}
            </button>
          </div>
          <a href={collectionUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>
            Відкрити колекцію →
          </a>
        </div>
      )}

      {/* Результат — одиночний файл */}
      {shareUrls.length === 1 && !collectionUrl && (
        <div style={resultBox}>
          <p style={{ fontSize: 12, color: '#065f46', margin: '0 0 8px' }}>Посилання для доступу:</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={shareUrls[0]} readOnly style={{ ...inputStyle, flex: 1, background: 'white' }} />
            <button onClick={() => copy(shareUrls[0])} style={copyBtnStyle}>
              {copied ? '✓' : 'Копіювати'}
            </button>
          </div>
          <a href={shareUrls[0]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>
            Відкрити →
          </a>
        </div>
      )}
    </div>
  );
}

const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'var(--gray-900)', marginBottom: 16 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--gray-700)', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-900)' };
const btnStyle: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const copyBtnStyle: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' as const };
const resultBox: React.CSSProperties = { marginTop: 20, padding: 16, borderRadius: 10, border: '1px solid #6ee7b7', background: '#d1fae5' };