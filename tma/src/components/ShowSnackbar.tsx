import { FC } from "react";
import { Snackbar, IconButton, Caption } from "@telegram-apps/telegram-ui";
import { Icon48WritebarDone, Icon56ErrorTriangleOutline, Icon16Cancel } from "@vkontakte/icons";

interface SnackbarProps {
  message: string;
  type?: "success" | "error" | "sent";
  onClose: () => void;
}

export const ShowSnackbar: FC<SnackbarProps> = ({ message, type = "success", onClose }) => {
  return (
    <Snackbar
      style={{ bottom: 80 }}
      duration={8000}
      before={
        type === "success" ? (
          <Icon48WritebarDone color="limegreen" width={50} height={50} />
        ) : type === "error" ? (
          <Icon56ErrorTriangleOutline color="yellow" width={50} height={50} />
        ) : (
          <Icon48WritebarDone color="limegreen" width={50} height={50} />
        )
      }
      onClose={onClose}
      description={<Caption>{message}</Caption>}
      after={
        <IconButton mode="plain" onClick={onClose}>
          <Icon16Cancel />
        </IconButton>
      }
    >
      {type === "success" ? "Success" : type === "error" ? "An error occurred" : "Transaction sent!"}
    </Snackbar>
  );
};
