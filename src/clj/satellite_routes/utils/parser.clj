(ns satellite-routes.utils.parser
  (:require [loom.graph :as graph]
            [loom.alg :as graph-alg]
            [clojure.string :as string]
            [clojure.pprint :as pprint]
            [satellite-routes.utils.algorithm :as alg]))


(defn satellite-in-cartesian
  " Converts the position of the satellite given as parameter from [latitude longitude altitude] into [x y z]. "
  [satellite planet-radius]
  (let [[lat long alt] (:geo-pos satellite)
        dist-from-origin (+ alt planet-radius)
        cartesian-pos (alg/as-cartesian dist-from-origin
                                        lat
                                        long)]
    {:name (:name satellite)
     :pos cartesian-pos}))


(defn parse-generated-data
  " Converts all geographic coordinates in raw-map into cartesian coordinates. "
  [raw-map planet-radius]
  (let [geo-satellites (:satellites raw-map)
        [start-lat start-long
         end-lat end-long] (:route raw-map)
         earth-surface (+ planet-radius 0.1)
        route-start (alg/as-cartesian earth-surface
                                      start-lat
                                      start-long)
        route-end (alg/as-cartesian earth-surface
                                    end-lat
                                    end-long)]
    {:satellites (vec (map #(satellite-in-cartesian % planet-radius) geo-satellites))
     :route {:start route-start
             :end route-end}}))


(defn generate-data
  " Generates satellite position data from 0 to n-1 and a random route with a start and end position. Uses the parse-generated-data function to convert all generated geographic coordinates into cartesian coordinates. Expects one parameter, which is a vector with 4 values. "
  [[n min-alt max-alt planet-radius]]
  (let [rand-longitude #(- (rand 360) 180)
        rand-latitude #(- (rand 180) 90)
        delta-min-max-alt (- max-alt min-alt)]
    (loop [sat-n 0
           hashmap {:satellites []}]
      (if (>= sat-n n)
        (let [start-lat (rand-latitude)
              start-long (rand-longitude)
              end-lat (rand-latitude)
              end-long (rand-longitude)
              route (conj [] start-lat start-long end-lat end-long)
              generated-data (assoc hashmap :route route)]
          (parse-generated-data generated-data planet-radius))
        (let [lat (rand-latitude)
              long (rand-longitude)
              alt (+ (rand delta-min-max-alt) min-alt)
              sat-vec (:satellites hashmap)]
          (recur (inc sat-n)
                 (assoc hashmap :satellites
                   (conj sat-vec {:name (str "SAT" sat-n)
                                  :geo-pos [lat long alt]}))))))))

