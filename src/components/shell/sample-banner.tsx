export function SampleBanner({ demo }: { demo: boolean }) {
  if (!demo) return null;
  return (
    <div className="border-b border-dashed border-brass-deep/50 bg-brass-tint px-4 py-2 text-center text-[0.9rem] font-semibold text-brass-deep">
      Preview with sample data. Every name, date and amount here is made up.
    </div>
  );
}
