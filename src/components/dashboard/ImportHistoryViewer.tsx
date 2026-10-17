import { useImportBatches } from '@/hooks/useImportBatches';

export default function ImportHistoryViewer() {
  const { data, isLoading } = useImportBatches();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <h2>Import History</h2>
      {(data ?? []).map((b: { id: string; filename: string; imported_count: number }) => (
        <div key={b.id}>
          <span>{b.filename}</span>
          <span>{b.imported_count} imported</span>
        </div>
      ))}
    </div>
  );
}
