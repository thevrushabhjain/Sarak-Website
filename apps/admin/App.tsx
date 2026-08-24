import { useState } from "react";
import { StatusBar } from "expo-status-bar";

import type { User } from "./src/config";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";

// Simple state routing: the portal is two screens for now (login / shell);
// React Navigation only becomes worth it once real tab stacks land.
export default function App() {
  const [user, setUser] = useState<User | null>(null);

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
