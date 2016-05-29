(ns satellite-routes.routes.home
  (:require [satellite-routes.layout :as layout]
            [compojure.core :refer [defroutes GET]]
            [satellite-routes.utils.parser :as parser]
            [ring.util.http-response :as response]
            [clojure.pprint :as pprint]
            [clj-json.core :as json]
            [clojure.java.io :as io]))


; ----------------
; Views for routes
; ----------------

(defn home-page [query]
  (if (= (:query-string query) "high-res")
    (layout/render "graphics_content.html" {:highResTextures true})
    (layout/render "graphics_content.html" {:highResTextures false})))

(defn generate-json [query]
  " Depending on the query, returns the generated json-data or
    renders the generator api page with the json-data prettified."
  (let [json-data (parser/generate-graph-from-query (:params query))]
    (if (contains? query :view-json)
      (layout/render "generator.html" json-data)
      (let [json-response {:status 200
                           :headers {"Content-Type" "application/json"}
                           :body (json/generate-string json-data)}]
        json-response))))

(defn view-json [query]
  " Adds a flag to the query so generate-json knows it should show
  the result in the rendered template and not just return raw json."
  (generate-json (assoc query :view-json true)))

(defn solve-data [query]
  " Takes a sequence of existing satellite positions, updates their
  connections and solves the shortest path between 'START' and 'END'."
  (let [json-data (parser/update-solution-from-query (:query-string query))]
    ; parsing errors could (=should) be sent as status 400 responses but
    ; it's more user friendly to send an error flag with the json-data
    ; that could be dynamically printed in the app with some nice js+css
    {:status 200
     :headers {"Content-Type" "application/json"}
     :body (json/generate-string json-data)}))

(defn about-page []
  (layout/render "about.html"))


(defroutes home-routes
  (GET "/" [] #(home-page %))
  (GET "/generator.json" [] #(generate-json %))
  (GET "/generator" [] #(view-json %))
  (GET "/solve.json" [] #(solve-data %))
  (GET "/about" [] (about-page)))

