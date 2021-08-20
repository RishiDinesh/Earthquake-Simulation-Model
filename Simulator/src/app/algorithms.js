import { useEffect, useState } from "react";

export const Algorithms = {
  FCFS: "First-Come First-Served",
  SJF: "Shortest-Job First",
  SJRF: "Shortest-Job Remaining First",
  P: "Priority",
  RR: "Round-Robin",
};

const useAlgorithm = (algorithm, quantum, onStart, onActive, onCompleted) => {
  const [pendingQueue, updatePendingQueue] = useState([]);
  const [activeProcess, setActiveProcess] = useState(null);
  const [completedQueue, updateCompletedQueue] = useState([]);
  const [suspendedProcess, setSuspendedProcess] = useState(null);
  const [currentQuantum, setCurrentQuantum] = useState(quantum);

  const [completedCount, setCompletedCount] = useState(0);

  const [timeElapsed, setTimeElapsed] = useState(0);

  const addActiveProcessFromPendingQueue = (updatedPendingQueue) => {
    const currentActiveProcess = updatedPendingQueue.shift();

    updatePendingQueue(updatedPendingQueue);
    setActiveProcess(currentActiveProcess);
    currentActiveProcess.burstTime -= 1;
    onStart(currentActiveProcess);

    if (currentActiveProcess.burstTime === 0) onActiveProcessComplete();
  };

  const onActiveProcessComplete = () => {
    const completedProcess = { ...activeProcess };
    console.log(completedProcess);
    completedProcess.completionTime =
      timeElapsed +
      Number(algorithm === Algorithms.FCFS || algorithm === Algorithms.SJF);
    completedProcess.turnAroundTime =
      completedProcess.completionTime - completedProcess.arrivalTime;
    completedProcess.waitingTime =
      completedProcess.turnAroundTime - completedProcess.maxBurstTime;

    updateCompletedQueue((completedQueue) => [
      ...completedQueue,
      completedProcess,
    ]);
    onCompleted(completedProcess);
    setActiveProcess((_) => null);
  };

  const executeAlgorithm = {
    [Algorithms.FCFS]: () => {
      if (activeProcess) {
        activeProcess.burstTime -= 1;
        onActive(activeProcess);

        if (activeProcess.burstTime === 0) onActiveProcessComplete();
        return;
      }

      if (pendingQueue.length > 0) {
        let updatedPendingQueue = [...pendingQueue];
        addActiveProcessFromPendingQueue(updatedPendingQueue);
      }
    },
    [Algorithms.SJF]: () => {
      if (activeProcess) {
        activeProcess.burstTime -= 1;
        onActive(activeProcess);

        if (activeProcess.burstTime === 0) onActiveProcessComplete();
        return;
      }

      if (pendingQueue.length > 0) {
        let updatedPendingQueue = [...pendingQueue].sort(
          (p1, p2) => p1.burstTime - p2.burstTime
        );
        addActiveProcessFromPendingQueue(updatedPendingQueue);
      }
    },
    [Algorithms.P]: () => {
      if (activeProcess) {
        setActiveProcess((activeProcess) => ({
          ...activeProcess,
          burstTime: activeProcess.burstTime - 1,
        }));
        onActive(activeProcess);

        if (activeProcess.burstTime === 0) onActiveProcessComplete();
        return;
      }

      if (pendingQueue.length > 0) {
        let updatedPendingQueue = [...pendingQueue].sort(
          (p1, p2) => p1.priority - p2.priority
        );
        addActiveProcessFromPendingQueue(updatedPendingQueue);
      }
    },
    [Algorithms.RR]: () => {
      let updatedPendingQueue = [...pendingQueue];
      if (suspendedProcess) {
        updatedPendingQueue.push(suspendedProcess);
        setCurrentQuantum(quantum);
        setSuspendedProcess(null);
      }

      if (activeProcess) {
        setActiveProcess((activeProcess) => ({
          ...activeProcess,
          burstTime: activeProcess.burstTime - 1,
        }));
        onActive(activeProcess);

        setCurrentQuantum((quantum) => quantum - 1);
        if (activeProcess.burstTime === 0) onActiveProcessComplete();
        else {
          if (currentQuantum === 0 && activeProcess) {
            const suspendedProcess = activeProcess;
            updatePendingQueue((pendingQueue) => [
              ...pendingQueue,
              activeProcess,
            ]);
            setSuspendedProcess(suspendedProcess);
            setActiveProcess((_) => null);

            return;
          }
        }

        return;
      }

      if (updatedPendingQueue.length > 0) {
        addActiveProcessFromPendingQueue(updatedPendingQueue);
      }
    },
  };

  useEffect(() => {
    console.log("added", completedCount);
  }, [completedCount]);

  useEffect(() => {
    const algorithmTick = setTimeout(() => {
      executeAlgorithm[algorithm]();

      setTimeElapsed((timeElapsed) => timeElapsed + 1);
    }, 1000);

    return () => clearTimeout(algorithmTick);
  }, [timeElapsed]);

  const addToQueue = (processes) => {
    updatePendingQueue((pendingQueue) => [
      ...pendingQueue,
      ...processes.map((process) => ({
        ...process,
        arrivalTime: timeElapsed + 1,
      })),
    ]);
    setCompletedCount((completedCount) => completedCount + processes.length);
  };

  return {
    timeElapsed,
    pendingQueue,
    activeProcess,
    completedQueue,
    addToQueue,
    suspendedProcess,
  };
};

export default useAlgorithm;
