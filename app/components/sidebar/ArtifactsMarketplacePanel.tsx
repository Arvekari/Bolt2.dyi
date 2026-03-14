import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '~/components/ui/Button';
import { collabStore } from '~/lib/stores/collab';

type ArtifactType = 'module' | 'component' | 'snippet' | 'asset';

type ArtifactRecord = {
  id: string;
  name: string;
  description: string | null;
  artifactType: ArtifactType;
  visibility: 'private' | 'project' | 'public';
  content: string;
  metadata: Record<string, any> | null;
  updatedAt: string;
};

const artifactTypeLabel: Record<ArtifactType, string> = {
  module: 'Module',
  component: 'Component',
  snippet: 'Snippet',
  asset: 'Asset',
};

const artifactTypeVisual: Record<ArtifactType, { icon: string; gradient: string }> = {
  module: { icon: '🧩', gradient: 'from-indigo-500/40 via-blue-500/30 to-cyan-500/40' },
  component: { icon: '🧱', gradient: 'from-violet-500/40 via-fuchsia-500/30 to-pink-500/40' },
  snippet: { icon: '✂️', gradient: 'from-emerald-500/40 via-teal-500/30 to-cyan-500/40' },
  asset: { icon: '🖼️', gradient: 'from-orange-500/40 via-amber-500/30 to-yellow-500/40' },
};

export function ArtifactsMarketplacePanel() {
  const collab = useStore(collabStore);

  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ArtifactType>('all');

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<ArtifactType>('module');
  const [newVisibility, setNewVisibility] = useState<'private' | 'project' | 'public'>('project');
  const [newPreviewImageUrl, setNewPreviewImageUrl] = useState('');

  const loadArtifacts = useCallback(async () => {
    const query = collab.selectedProjectId ? `?projectId=${encodeURIComponent(collab.selectedProjectId)}` : '';
    const response = await fetch(`/api/collab/artifacts${query}`);
    const data = (await response.json()) as any;

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || 'Failed to load artifacts');
    }

    setArtifacts(data.artifacts || []);
  }, [collab.selectedProjectId]);

  useEffect(() => {
    loadArtifacts().catch((error) => {
      console.error(error);
      toast.error('Failed to load artifacts');
    });
  }, [loadArtifacts]);

  const visibleArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      if (typeof artifact.metadata?.systemKind === 'string' && artifact.metadata.systemKind.startsWith('project-')) {
        return false;
      }

      if (typeFilter !== 'all' && artifact.artifactType !== typeFilter) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const normalizedSearch = search.toLowerCase();
      return (
        artifact.name.toLowerCase().includes(normalizedSearch) ||
        (artifact.description || '').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [artifacts, search, typeFilter]);

  const createArtifact = async () => {
    const name = newName.trim();
    const content = newContent.trim();

    if (!name || !content) {
      toast.error('Artifact name and reusable content are required');
      return;
    }

    const metadata = newPreviewImageUrl.trim() ? { previewImageUrl: newPreviewImageUrl.trim() } : null;

    const response = await fetch('/api/collab/artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'create',
        projectId: collab.selectedProjectId,
        name,
        description: newDescription.trim() || null,
        artifactType: newType,
        visibility: newVisibility,
        content,
        metadata,
      }),
    });

    const data = (await response.json()) as any;

    if (!response.ok || !data?.ok) {
      toast.error(data?.error || 'Failed to create artifact');
      return;
    }

    setNewName('');
    setNewDescription('');
    setNewContent('');
    setNewPreviewImageUrl('');

    await loadArtifacts();
    toast.success('Reusable artifact saved to library');
  };

  const copyArtifact = async (artifact: ArtifactRecord) => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      toast.success(`Copied ${artifact.name}`);
    } catch {
      toast.error('Failed to copy artifact content');
    }
  };

  const inputClassName =
    'w-full rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 px-2 py-1 text-xs text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary focus:outline-none focus:ring-1 focus:ring-bolt-elements-borderColorActive';

  return (
    <div className="space-y-3 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-3">
      <div className="text-xs font-semibold text-bolt-elements-textSecondary">Artifacts Library (Reusable Marketplace)</div>

      <div className="rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-2">
        <div className="mb-2 text-[11px] font-semibold text-bolt-elements-textSecondary">Save reusable artifact</div>

        <div className="grid grid-cols-1 gap-2">
          <input
            className={inputClassName}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Artifact name"
          />

          <input
            className={inputClassName}
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Short description"
          />

          <div className="grid grid-cols-3 gap-2">
            <select className={inputClassName} value={newType} onChange={(event) => setNewType(event.target.value as ArtifactType)}>
              <option value="module">Module</option>
              <option value="component">Component</option>
              <option value="snippet">Snippet</option>
              <option value="asset">Asset</option>
            </select>

            <select
              className={inputClassName}
              value={newVisibility}
              onChange={(event) => setNewVisibility(event.target.value as 'private' | 'project' | 'public')}
            >
              <option value="private">Private</option>
              <option value="project">Project</option>
              <option value="public">Public</option>
            </select>

            <input
              className={inputClassName}
              value={newPreviewImageUrl}
              onChange={(event) => setNewPreviewImageUrl(event.target.value)}
              placeholder="Preview image URL"
            />
          </div>

          <textarea
            className={`${inputClassName} min-h-[90px] resize-y`}
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            placeholder="Reusable function/module/component code or inclusion template..."
          />

          <div className="flex justify-end">
            <Button size="sm" onClick={createArtifact} disabled={!newName.trim() || !newContent.trim()}>
              Add to library
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputClassName}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search artifacts"
        />
        <select className={inputClassName} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | ArtifactType)}>
          <option value="all">All types</option>
          <option value="module">Modules</option>
          <option value="component">Components</option>
          <option value="snippet">Snippets</option>
          <option value="asset">Assets</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
        {visibleArtifacts.length === 0 && (
          <div className="rounded-md border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-3 text-xs text-bolt-elements-textTertiary">
            No artifacts yet. Save your first reusable module/component/snippet above.
          </div>
        )}

        {visibleArtifacts.map((artifact) => {
          const visual = artifactTypeVisual[artifact.artifactType];
          const previewImageUrl = typeof artifact.metadata?.previewImageUrl === 'string' ? artifact.metadata.previewImageUrl : '';

          return (
            <div
              key={artifact.id}
              className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 overflow-hidden"
            >
              <div className={`h-20 w-full bg-gradient-to-r ${visual.gradient} relative`}>
                {previewImageUrl ? (
                  <img src={previewImageUrl} alt={artifact.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">{visual.icon}</div>
                )}
              </div>

              <div className="p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-bolt-elements-textPrimary">{artifact.name}</div>
                    <div className="text-[11px] text-bolt-elements-textSecondary">{artifactTypeLabel[artifact.artifactType]} • {artifact.visibility}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void copyArtifact(artifact)}>
                    Copy
                  </Button>
                </div>

                {artifact.description && (
                  <p className="mt-1 text-[11px] text-bolt-elements-textSecondary line-clamp-2">{artifact.description}</p>
                )}

                <div className="mt-2 rounded border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-2 py-1 text-[11px] text-bolt-elements-textTertiary line-clamp-2">
                  {artifact.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
