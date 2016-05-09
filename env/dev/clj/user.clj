(ns user
  (:require [mount.core :as mount]
            [satellite-routes.figwheel :refer [start-fw stop-fw cljs]]
            satellite-routes.core))

(defn start []
  (mount/start-without #'satellite-routes.core/repl-server))

(defn stop []
  (mount/stop-except #'satellite-routes.core/repl-server))

(defn restart []
  (stop)
  (start))


