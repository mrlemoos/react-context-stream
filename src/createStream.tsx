import {
  useRef,
  useCallback,
  createContext,
  ReactNode,
  ReactElement,
  useContext,
  useSyncExternalStore,
} from "react";

import InternalStreamNotFoundException from "./InternalStreamNotFoundException";
import SubscribeFunction from "./SubscribeFunction";
import UpdateStreamValueFunction from "./UpdateStreamValueFunction";

const createStream = <TStreamDataObject extends object>(
  initialState: Partial<TStreamDataObject> = {}
) => {
  const useStream = () => {
    const store = useRef<TStreamDataObject>(initialState as TStreamDataObject);
    const subscribers = useRef(new Set<SubscribeFunction>());

    const get = useCallback(() => store.current, []);
    const update = useCallback((value: Partial<TStreamDataObject>) => {
      store.current = { ...store.current, ...value };

      subscribers.current.forEach((subscribeFn) => subscribeFn());
    }, []);

    const subscribe = useCallback((subscribeFn: SubscribeFunction) => {
      subscribers.current.add(subscribeFn);

      return () => subscribers.current.delete(subscribeFn);
    }, []);

    return {
      get,
      update,
      subscribe,
    };
  };

  type UseStreamReturnType = ReturnType<typeof useStream>;

  const InternalStreamContext = createContext<UseStreamReturnType>(
    {} as UseStreamReturnType
  );

  interface InternalStreamProviderProps {
    children: ReactNode;
  }

  const StreamStorageProvider = ({
    children,
  }: InternalStreamProviderProps): ReactElement => {
    const data = useStream();

    return (
      <InternalStreamContext.Provider value={data}>
        {children}
      </InternalStreamContext.Provider>
    );
  };

  const useStreamStorage = <TStreamSelectedObject,>(
    selector: (state: TStreamDataObject) => TStreamSelectedObject
  ): [TStreamSelectedObject, UpdateStreamValueFunction<TStreamDataObject>] => {
    const internalStream = useContext(InternalStreamContext);

    if (!internalStream) {
      throw new InternalStreamNotFoundException("Internal stream not found");
    }

    const store = useSyncExternalStore(
      internalStream.subscribe,
      () => selector(internalStream.get()),
      () => selector(initialState as TStreamDataObject)
    );

    const storageTuple: [
      TStreamSelectedObject,
      UpdateStreamValueFunction<TStreamDataObject>
    ] = [store, internalStream.update];

    return storageTuple;
  };

  return [StreamStorageProvider, useStreamStorage];
};

export default createStream;
