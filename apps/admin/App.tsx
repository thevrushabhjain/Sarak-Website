import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

import type { User } from "./src/config";
import { setUnauthorizedHandler } from "./src/api";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";

// Simple state routing: login → shell; the shell hosts per-task sections.
// React Navigation only becomes worth it once real tab stacks land.
export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Any admin/content call answered 401 (expired session, disabled account)
  // drops the whole app back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);
  return (
    <>
      <StatusBar style="light" />
      {user ? (
        <HomeScreen user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginScreen onLoggedIn={setUser} />
      )}
    </>
  );
}
