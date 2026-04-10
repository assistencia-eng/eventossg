import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogIn } from "lucide-react";

interface LoginRequiredModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginRequiredModal = ({ open, onClose }: LoginRequiredModalProps) => {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-primary" />
            Login necessário
          </AlertDialogTitle>
          <AlertDialogDescription>
            Faça login para favoritar eventos, personalizar seus interesses e acessar seu perfil.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onClose(); navigate("/auth"); }}>
            Fazer login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LoginRequiredModal;
