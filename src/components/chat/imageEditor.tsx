import cn from "classnames";
import { useTranslation } from "react-i18next";
import { LoaderIcon } from "./icons";

type ImageEditorProps = {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
};

export function ImageEditor({
  title,
  content,
  status,
  isInline,
}: ImageEditorProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn("flex w-full flex-row items-center justify-center", {
        "h-[200px]": isInline,
        "min-h-full py-6": !isInline,
      })}
    >
      {status === "streaming" ? (
        <div className="flex flex-row items-center gap-4">
          {!isInline && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
          <div>{t("chat.generatingImage")}</div>
        </div>
      ) : (
        <picture>
          <img
            alt={title}
            className={cn("h-fit max-h-full w-full max-w-[800px] object-contain", {
              "p-0 sm:p-4 lg:p-8": !isInline,
            })}
            src={`data:image/png;base64,${content}`}
          />
        </picture>
      )}
    </div>
  );
}
