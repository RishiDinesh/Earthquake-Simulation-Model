import { useEffect, useState } from "react";
import uuid from "react-uuid";
import { Modal, ModalBody, ModalHeader, Table } from "reactstrap";
import "./App.css";

import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import { initializeEarthquake } from "./data/earthquake";
import { getTestInfo } from "../references/info";

const getAverage = (list) => {
  if (list.length === 0) return (0).toFixed(2);
  return (
    list.reduce((sum, current) => sum + current, 0) / list.length
  ).toFixed(2);
};

function App() {
  //#region States
  const [earthquakeInfo, setEarthquakeInfo] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [info, setInfo] = useState({
    completedAt: 0,
    survivorsCount: 0,
    deadCount: 0,
    evacuation: [],
    firstAid: {},
    medicalCamp: {},
    foodCollection: [],
    foodDistribution: {},
    inspection: [],
    rebuilding: [],
  });
  const [startTick, setStartTick] = useState(null);
  const [logs, updateLogs] = useState([]);

  useEffect(() => {
    console.log(info);
  }, [isCompleted]);

  // console.log(info);

  const [populationInFaultRegion, setPopulationInFaultRegion] = useState(null);
  //#endregion

  const createEarthquake = () => {
    const earthquakeInfo = initializeEarthquake();
    console.log(earthquakeInfo);
    setEarthquakeInfo(earthquakeInfo);
    setPopulationInFaultRegion(
      earthquakeInfo.populationProperties.populationInFaultRegion
    );

    const currentTick = performance.now();
    setStartTick(currentTick);

    updateLogs([]);
  };

  const toggleModal = () => {
    setIsCompleted((isCompleted) => !isCompleted);
  };

  return (
    <div className="app">
      <Modal
        scrollable
        fade
        centered
        unmountOnClose
        isOpen={isCompleted}
        toggle={toggleModal}
        contentClassName="info-modal">
        <ModalHeader className="bg-dark text-white" toggle={toggleModal}>
          Simulation Information
        </ModalHeader>
        <ModalBody>
          {isCompleted && (
            <>
              <h4>
                Evacuation Scheduling Details (Algorithm: Shortest-Job First)
              </h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>EvacuationCenter ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.evacuation &&
                      info.evacuation.map(
                        ({
                          id,
                          arrivalTime,
                          waitingTime,
                          burstTime,
                          turnAroundTime,
                          completionTime,
                        }) => (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        )
                      )}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(info.evacuation.map((e) => e.waitingTime))}
                      </td>
                      <td>
                        {getAverage(
                          info.evacuation.map((e) => e.turnAroundTime)
                        )}
                      </td>
                      <td>
                        {getAverage(
                          info.evacuation.map((e) => e.completionTime)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <h4>
                Inspection Scheduling Details (Algorithm: First-Come
                First-Served)
              </h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>House ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.inspection &&
                      info.inspection.map(
                        ({
                          id,
                          arrivalTime,
                          waitingTime,
                          burstTime,
                          turnAroundTime,
                          completionTime,
                        }) => (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        )
                      )}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(info.inspection.map((e) => e.waitingTime))}
                      </td>
                      <td>
                        {getAverage(
                          info.inspection.map((e) => e.turnAroundTime)
                        )}
                      </td>
                      <td>
                        {getAverage(
                          info.inspection.map((e) => e.completionTime)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <h4>
                House-Rebuilding Scheduling Details (Algorithm: Shortest-Job
                First)
              </h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>House ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.rebuilding &&
                      info.rebuilding.map(
                        ({
                          id,
                          arrivalTime,
                          waitingTime,
                          burstTime,
                          turnAroundTime,
                          completionTime,
                        }) => (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        )
                      )}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(info.rebuilding.map((e) => e.waitingTime))}
                      </td>
                      <td>
                        {getAverage(
                          info.rebuilding.map((e) => e.turnAroundTime)
                        )}
                      </td>
                      <td>
                        {getAverage(
                          info.rebuilding.map((e) => e.completionTime)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <h4>
                Food Collection Scheduling Details (Algorithm: Shortest-Job
                First)
              </h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>Food-Center ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.foodCollection &&
                      info.foodCollection.map(
                        ({
                          id,
                          arrivalTime,
                          waitingTime,
                          burstTime,
                          turnAroundTime,
                          completionTime,
                        }) => (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        )
                      )}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(
                          info.foodCollection.map((e) => e.waitingTime)
                        )}
                      </td>
                      <td>
                        {getAverage(
                          info.foodCollection.map((e) => e.turnAroundTime)
                        )}
                      </td>
                      <td>
                        {getAverage(
                          info.foodCollection.map((e) => e.completionTime)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <h4>
                First-Aid Scheduling Details (Algorithm: Round-Robin, Quantum:
                10 mins.)
              </h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>Person ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.firstAid &&
                      Object.keys(info.firstAid).map((id) => {
                        const {
                          arrivalTime,
                          burstTime,
                          waitingTime,
                          turnAroundTime,
                          completionTime,
                        } = info.firstAid[id];
                        return (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        );
                      })}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.firstAid).map(
                            (id) => info.firstAid[id].waitingTime
                          )
                        )}
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.firstAid).map(
                            (id) => info.firstAid[id].turnAroundTime
                          )
                        )}
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.firstAid).map(
                            (id) => info.firstAid[id].completionTime
                          )
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <h4>Medical Camp Scheduling Details (Algorithm: Priority)</h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>Person ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.medicalCamp &&
                      Object.keys(info.medicalCamp).map((id) => {
                        const {
                          arrivalTime,
                          burstTime,
                          waitingTime,
                          turnAroundTime,
                          completionTime,
                        } = info.medicalCamp[id];
                        return (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        );
                      })}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.medicalCamp).map(
                            (id) => info.medicalCamp[id].waitingTime
                          )
                        )}
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.medicalCamp).map(
                            (id) => info.medicalCamp[id].turnAroundTime
                          )
                        )}
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.medicalCamp).map(
                            (id) => info.medicalCamp[id].completionTime
                          )
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              <h4>
                Food Distribution Scheduling Details (Algorithm: Priority)
              </h4>
              <div className="table">
                <Table dark bordered hover striped>
                  <thead>
                    <tr>
                      <th>Person ID</th>
                      <th>Arrival Time (in minutes)</th>
                      <th>Burst Time (in minutes)</th>
                      <th>Waiting Time (in minutes)</th>
                      <th>Turn-Around Time (in minutes)</th>
                      <th>Completion Time (in minutes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.foodDistribution &&
                      Object.keys(info.foodDistribution).map((id) => {
                        const {
                          arrivalTime,
                          burstTime,
                          waitingTime,
                          turnAroundTime,
                          completionTime,
                        } = info.foodDistribution[id];
                        return (
                          <tr scope="row">
                            <td>{id}</td>
                            <td>{arrivalTime}</td>
                            <td>{burstTime}</td>
                            <td>{waitingTime}</td>
                            <td>{turnAroundTime}</td>
                            <td>{completionTime}</td>
                          </tr>
                        );
                      })}
                    <tr>
                      <td colSpan="2"></td>
                      <td>
                        <b>Average</b>
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.foodDistribution).map(
                            (id) => info.foodDistribution[id].waitingTime
                          )
                        )}
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.foodDistribution).map(
                            (id) => info.foodDistribution[id].turnAroundTime
                          )
                        )}
                      </td>
                      <td>
                        {getAverage(
                          Object.keys(info.foodDistribution).map(
                            (id) => info.foodDistribution[id].completionTime
                          )
                        )}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </ModalBody>
      </Modal>
      <Map
        earthquakeId={earthquakeInfo?.id}
        mapBounds={earthquakeInfo?.mapBounds}
        faultRegion={earthquakeInfo?.faultRegion}
        populationInFaultRegion={populationInFaultRegion}
        updatePopulationInFaultRegion={setPopulationInFaultRegion}
        populationSurrounding={
          earthquakeInfo?.populationProperties.populationSurrounding || []
        }
        housesInFaultRegion={
          earthquakeInfo?.houseProperties.housesInFaultRegion || []
        }
        housesSurrounding={
          earthquakeInfo?.houseProperties.housesSurrounding || []
        }
        evacuationCenters={
          earthquakeInfo?.phaseProperties.evacuation.evacuationCenters || []
        }
        firstAidCamp={earthquakeInfo?.phaseProperties.firstAid.firstAidCamp}
        medicalCamp={earthquakeInfo?.phaseProperties.medicalCamp.medicalCamp}
        foodDistributionCenter={
          earthquakeInfo?.phaseProperties.foodDistribution
            .foodDistributionCenter
        }
        foodCenters={
          earthquakeInfo?.phaseProperties.foodDistribution.foodCenters
        }
        inspectionCenter={
          earthquakeInfo?.phaseProperties.inspection.inspectionCenter
        }
        reallocationCenter={
          earthquakeInfo?.phaseProperties.reallocation.reallocationCenter
        }
        updateLogs={updateLogs}
        setIsCompleted={setIsCompleted}
        setInfo={setInfo}
      />
      <Sidebar
        logs={logs}
        createEarthquake={createEarthquake}
        startTick={startTick}
        populationInFaultRegion={populationInFaultRegion}
        housesInFaultRegion={
          earthquakeInfo?.houseProperties.housesInFaultRegion
        }
        faultRegion={earthquakeInfo?.faultRegion.properties}
        setIsCompleted={setIsCompleted}
      />
    </div>
  );
}

export default App;
