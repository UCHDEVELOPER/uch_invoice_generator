export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-20 w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}
