type FetchProps<T> = {
  csvData: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  callback: ({
    data,
    tableData,
  }: {
    data: T[];
    tableData: { name: string; address: string; email?: string }[];
  }) => void;
};

type UploadProps<T> = {
  event: React.ChangeEvent<HTMLInputElement>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  callback: ({
    data,
    tableData,
  }: {
    data: T[];
    tableData: { name: string; address: string; email?: string }[];
  }) => void;
};
export type FileUploadHandler<T> = (props: UploadProps<T>) => void;
export type FileUploadFetch<T> = (props: FetchProps<T>) => void;
export type UploadOptions<T> = {
  type: keyof T;
  parseHandler: FileUploadHandler<T>;
  handleAccept: ({ data, saveToDB }: { data: T[]; saveToDB?: boolean }) => void;
  currentData?: T[] | null;
};

export type FetchOptions<T> = {
  type: keyof T;
  parseHandler: FileUploadFetch<T>;
  handleAccept: ({ data, saveToDB }: { data: T[]; saveToDB?: boolean }) => void;
  currentData?: T[] | null;
};
