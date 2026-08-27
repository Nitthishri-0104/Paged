import { redirect } from "next/navigation";

// The proxy already sends signed-out visitors to /login, so anyone who
// reaches "/" is authenticated — the only thing left to decide is where the
// app's home view lives.
export default function RootPage() {
  redirect("/notes");
}
