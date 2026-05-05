import type { GrepolisTables } from "../types/grepolis";

export const sampleTables: GrepolisTables = {
  alliances: [
    "1,Alliance%20Bleue,125000,18,8,1",
    "2,Temple%20Rouge,98000,14,7,2",
    "3,Ligue%20Verte,42000,8,4,7",
  ].join("\n"),
  players: [
    "10,Athena,1,45000,2,5",
    "11,Poseidon,2,38000,4,4",
    "12,Hermes,3,9000,31,2",
    "13,Demeter,1,15500,18,3",
  ].join("\n"),
  islands: [
    "1001,450,520,1,5,wood,stone",
    "1002,462,528,2,5,stone,iron",
    "1003,475,515,3,5,iron,wood",
    "1004,489,536,4,5,wood,iron",
  ].join("\n"),
  towns: [
    "100,10,Athenes,450,520,1,12000",
    "101,11,Corinthe,450,520,2,9800",
    "102,,Ruines%20du%20Nord,450,520,3,6400",
    "103,12,Argos,462,528,1,4300",
    "104,13,Delphes,462,528,4,11000",
    "105,,Port%20fantome,475,515,2,8900",
    "106,10,Sparta,475,515,5,16400",
    "107,11,Naxos,489,536,1,7600",
    "108,,Ile%20silencieuse,489,536,3,10200",
  ].join("\n"),
};
