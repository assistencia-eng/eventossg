import { useAuth } from "@/contexts/AuthContext";

export const useAdmin = () => {
  const { isAdmin } = useAuth();
  return isAdmin;
};
