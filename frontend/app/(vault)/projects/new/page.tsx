'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

const TECH_SUGGESTIONS = [
  'Node.js', 'Next.js', 'React', 'Vue.js', 'Python', 'Django', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'TypeScript',
  'Express.js', 'NestJS', 'Prisma', 'Supabase', 'Vercel', 'AWS', 'Firebase',
];

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stack, setStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addTech = (tech: string) => {
    const t = tech.trim();
    if (t && !stack.includes(t)) setStack((prev) => [...prev, t]);
    setTechInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const { project } = await projectsApi.create({ name: name.trim(), description: description.trim(), stack });
      toast.success('Project created successfully!');
      router.push(`/projects/${project.id}`);
    } catch {
      const msg = 'Failed to create project. Please try again.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={14} /> All Projects
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>New Project</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Create a project to organize your secrets</p>
      </div>

      <div className="page-content">
        <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="label" htmlFor="name">Project Name *</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="e.g. Fintech API, E-commerce Platform"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input"
              placeholder="Brief description of this project (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              style={{ resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          <div className="form-group">
            <label className="label">Tech Stack</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Add technology..."
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTech(techInput); }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addTech(techInput)}
                disabled={!techInput.trim()}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Selected stack */}
            {stack.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {stack.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 100,
                      background: 'var(--primary-bg)', color: 'var(--primary-text)',
                      fontSize: 12, fontWeight: 500,
                    }}
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => setStack((prev) => prev.filter((t) => t !== tech))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {TECH_SUGGESTIONS.filter((t) => !stack.includes(t)).map((tech) => (
                <button
                  key={tech}
                  type="button"
                  className="badge badge-gray"
                  style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  onClick={() => addTech(tech)}
                >
                  + {tech}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Link href="/projects" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />}
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
