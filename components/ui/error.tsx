type FieldErrorProps = {
  id: string;
  message?: string;
};

export function FieldError({ id, message }: FieldErrorProps) {
  return (
    <div aria-live="polite">
      {message && (
        <p id={id} className="text-sm text-red-400">
          {message}
        </p>
      )}
    </div>
  );
}
