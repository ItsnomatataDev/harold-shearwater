export function isMissingDatabaseObject(error: {
  code?: string | null;
  message: string;
}) {
  return (
    error.code === "42703" ||
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /does not exist|could not find/i.test(error.message)
  );
}
