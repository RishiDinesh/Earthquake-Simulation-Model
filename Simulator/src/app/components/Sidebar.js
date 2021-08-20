import classNames from "classnames";
import React, { memo, useState } from "react";
import uuid from "react-uuid";
import {
  Card,
  CardBody,
  CardHeader,
  Nav,
  NavItem,
  NavLink,
  Progress,
  TabContent,
  TabPane,
  Button,
} from "reactstrap";

const formatDateString = (seconds) => {
  const minutes = parseInt(seconds / 60);
  const hours = parseInt(minutes / 60);
  const days = parseInt(hours / 24);

  return `${days} days ${hours % 24} hours ${minutes % 60} minutes`;
};

const EntityCard = memo(({ entityName, id, health, energy }) => (
  <Card className="mx-2 my-3 text-dark">
    <CardHeader tag="h5">
      {entityName} <small>#{id}</small>
    </CardHeader>
    <CardBody>
      <p>Current Health:</p>
      <div className="healthbar">
        <div className="healthbar-progress">
          <Progress
            style={{ height: "6px" }}
            value={health.toFixed(0)}
            color={
              health >= 50 ? "success" : health >= 25 ? "warning" : "danger"
            }
          />
        </div>
        <p className="mb-1">{health.toFixed(0)}%</p>
      </div>
      {energy && (
        <div className="energybar">
          {Array.from({ length: Math.ceil(energy) }, (_, index) => (
            <>
              <img
                key={`${id}-energy-${index}`}
                src="food.svg"
                alt="food"
                width={20}
                height={20}
                style={{ marginRight: "8px", color: "#c68958" }}
              />
            </>
          ))}
        </div>
      )}
    </CardBody>
  </Card>
));

const Sidebar = ({
  logs,
  startTick,
  populationInFaultRegion,
  createEarthquake,
  faultRegion,
  housesInFaultRegion,
  setIsCompleted,
}) => {
  const [activeTab, setActiveTab] = useState("1");

  const toggle = (tabIndex) => setActiveTab(tabIndex);

  return (
    <div className="logs bg-light">
      <Nav tabs className="tabs">
        <NavItem>
          <NavLink
            className={classNames({
              active: activeTab === "1",
              "bg-dark": activeTab === "1",
            })}
            onClick={() => {
              toggle("1");
            }}>
            LOGS
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classNames({
              active: activeTab === "2",
              "bg-dark": activeTab === "2",
            })}
            onClick={() => {
              toggle("2");
            }}>
            PEOPLE
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={classNames({
              active: activeTab === "3",
              "bg-dark": activeTab === "3",
            })}
            onClick={() => {
              toggle("3");
            }}>
            HOUSES
          </NavLink>
        </NavItem>
      </Nav>
      <div className="earthquake-info bg-dark text-white">
        <h5 className="timestamp p-3 text-center pb-0">
          Time Elapsed:{" "}
          {startTick
            ? formatDateString(((performance.now() - startTick) * 60) / 1000)
            : "0 days 0 hours 0 minutes"}
        </h5>
        <div className="earthquake-info--list">
          {faultRegion && (
            <>
              <span>Radius: {faultRegion.radius} KM</span>
              <span>Magnitude: {faultRegion.magnitude} ML</span>
            </>
          )}
          <Button onClick={() => setIsCompleted(true)} color="primary">
            View scheduling metrics
          </Button>
        </div>
      </div>
      <TabContent activeTab={activeTab} className="bg-dark">
        <TabPane tabId="1">
          {logs.length > 0 ? (
            logs.map((log) => (
              <p className="pl-2" key={uuid()}>
                &gt;&gt; {log}
              </p>
            ))
          ) : (
            <p className="text-center">Start simulation to view logs</p>
          )}
        </TabPane>
        <TabPane tabId="2">
          {populationInFaultRegion ? (
            populationInFaultRegion.features.map(
              ({ properties: { id, health, energy } }) => (
                <EntityCard
                  key={uuid()}
                  entityName="Person"
                  id={id}
                  health={health}
                  energy={energy}
                />
              )
            )
          ) : (
            <p className="text-center">
              Start simulation to view people information.
            </p>
          )}
        </TabPane>
        <TabPane tabId="3">
          {housesInFaultRegion ? (
            housesInFaultRegion.map(({ id, damage }) => (
              <EntityCard
                key={uuid()}
                entityName="House"
                id={id}
                health={Math.floor(100 - damage)}
              />
            ))
          ) : (
            <p className="text-center">
              Start simulation to view houses information.
            </p>
          )}
        </TabPane>
      </TabContent>
      <Button color="primary mt-2" size="lg" onClick={createEarthquake}>
        Simulate Earthquake
      </Button>
    </div>
  );
};

export default Sidebar;
