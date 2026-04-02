import VoiceRecorder from "@/components/VoiceRecorder";

export default function RecordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <h1 className="text-xl font-bold mb-2 text-white">Voice Memo</h1>
      <p className="text-gray-500 text-sm mb-8">
        声でメモを残して、AIが自動で整理します
      </p>
      <VoiceRecorder />
    </div>
  );
}
