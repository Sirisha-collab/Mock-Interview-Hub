export default function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`bg-white rounded-xl2 shadow-card border border-black/5 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
