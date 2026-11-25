export function SectionTitle({ children, as: Tag = "h2" }: { children: React.ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="mb-3 text-center">
      <Tag className="ribbon text-2xl">{children}</Tag>
    </div>
  );
}
