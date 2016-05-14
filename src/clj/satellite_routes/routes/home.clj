(ns satellite-routes.routes.home
  (:require [satellite-routes.layout :as layout]
            [compojure.core :refer [defroutes GET]]
            [satellite-routes.utils.core :as core]
            [satellite-routes.utils.parser :as parser]
            [ring.util.http-response :as response]
            [clojure.pprint :as pprint]
            [clj-json.core :as json]
            [clojure.java.io :as io]))


; --------------------------------------
; Helper functions for the JSON requests
; --------------------------------------

(defn integer-or-nil
  " Returns the parameter as an integer if the parameter is string containing an unsigned integer, else nil. "
  [string]
  (if (nil? string)
    nil
    (let [match (re-matches #"\d+" string)]
      (if (nil? match)
        nil
        (Integer/parseInt match)))))

(defn float-or-nil
  " Returns the parameter as a float if the parameter is string containing an unsigned integer or float, else nil. "
  [string]
  (if (nil? string)
    nil
    (let [match (re-matches #"[0-9]*\.?[0-9]+" string)]
      (if (nil? match)
        nil
        (Float/parseFloat match)))))


(defn parse-query-params
  " Parses the query parameters when data generation is requested.
    Returns a map of the parsed query parameters. "
  ;todo: add error message to response
  [query-params]
  (if-let [polyhedron (and (parser/valid-polyhedron? (:polyhedron query-params))
                           (:polyhedron query-params))]
    ;generate data as a polyhedron if the polyhedron name is provided
    ;and it is valid
    (let [planet-radius-default 6371.0
          min-alt-default 300.0

          pla-rad (float-or-nil (:planetRadius query-params))
          min-alt (float-or-nil (:minAltitude query-params))

          min-altitude (or min-alt min-alt-default)
          planet-radius (or pla-rad planet-radius-default)]
      {:random-data false
       :polyhedron polyhedron
       :planet-radius planet-radius
       :min-altitude min-altitude})

    ;else generate random data.
    (let [sat-count-default 20
          min-alt-default 300.0
          max-alt-default 700.0
          planet-radius-default 6371.0

          sat-cnt (integer-or-nil (:satelliteCount query-params))
          min-alt (float-or-nil (:minAltitude query-params))
          max-alt (float-or-nil (:maxAltitude query-params))
          pla-rad (float-or-nil (:planetRadius query-params))

          sat-count (or sat-cnt sat-count-default)
          min-altitude (if (and min-alt max-alt (> max-alt min-alt))
                         min-alt
                         min-alt-default)
          max-altitude (if (and min-alt max-alt (> max-alt min-alt))
                         max-alt
                         max-alt-default)
          planet-radius (or pla-rad planet-radius-default)]
      {:random-data true
       :planet-radius planet-radius
       :min-altitude min-altitude
       :max-altitude max-altitude
       :sat-count sat-count})))


; ----------------
; Views for routes
; ----------------

(defn home-page []
  (layout/render "home.html"))

(defn app-page [query]
  (if (= (:query-string query) "high-res")
    (layout/render "graphics_content.html" {:highResTextures true})
    (layout/render "graphics_content.html" {:highResTextures false})))


(defn generate-json [query]
  " Generates satellite position data and returns it as serialized JSON.
    If the query contains a valid polyhedron name, generate data according
    to it, else generate random data. "
  (println "query:")
  (pprint/pprint (:params query))
  (let [parsed-query (parse-query-params (:params query))
        data (if (:random-data parsed-query)
               (parser/generate-random-data (:sat-count parsed-query)
                                            (:min-altitude parsed-query)
                                            (:max-altitude parsed-query)
                                            (:planet-radius parsed-query))
               (parser/generate-polyhedron-data (:polyhedron parsed-query)
                                                (:min-altitude parsed-query)
                                                (:planet-radius parsed-query)))
        ;move core stuff into parser and return with one function
        sat-graph (core/sat-graph-with-endpoints data)
        nodes (core/graph-nodes sat-graph)
        all-edges (core/graph-edges sat-graph)
        edges (core/undirected-non-duplicate-edges all-edges)
        solution (core/solve-route sat-graph)
        edges-with-solution (core/apply-solution-path edges solution)

        json-data {:nodes nodes
                   :edges edges-with-solution}]
    (if (contains? query :view-json)
      (layout/render "generator.html" json-data)
      (let [json-response {:status 200
                           :headers {"Content-Type" "application/json"}
                           :body (json/generate-string json-data)}]
        json-response))))


(defn view-json [query]
  (generate-json (assoc query :view-json true)))

(defn about-page []
  (layout/render "about.html"))


(defroutes home-routes
  (GET "/" [] (home-page))
  (GET "/app" [] #(app-page %))
  (GET "/generator.json" [] #(generate-json %))
  (GET "/generator" [] #(view-json %))
  (GET "/about" [] (about-page)))

