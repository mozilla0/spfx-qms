import { QmsService } from './QmsService';
import { IQmsProcess } from './models';
import { useAsync } from './ui/components';

/** Löst den Prozess aus dem Query-String (?pid=) auf – gemeinsam für alle Webparts der Prozessseite. */
export function useProcess(service: QmsService, pid: string | undefined): {
  process?: IQmsProcess; error?: unknown; loading: boolean; reload: () => void;
} {
  const { data, error, loading, reload } = useAsync<IQmsProcess | undefined>(() => service.resolveProcess(pid), [service, pid]);
  return { process: data, error, loading, reload };
}
