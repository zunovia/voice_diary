import KnowledgeGraph from "@/components/KnowledgeGraph";
import StorageIndicator from "@/components/StorageIndicator";

export default function Home() {
  return (
    <div className="relative">
      <KnowledgeGraph />
      <div className="fixed bottom-20 right-4 z-40">
        <StorageIndicator compact />
      </div>
    </div>
  );
}
