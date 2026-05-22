export default function SearchBox({ value, onChange, placeholder = '搜索...' }) {
  return (
    <div className="relative">
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text3"
      >
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface2 border border-border-light rounded-lg py-[7px] pl-[34px] pr-3.5 text-text text-[13px] w-[220px] max-md:w-[140px] outline-none transition-colors focus:border-accent"
      />
    </div>
  );
}
