(ns satellite-routes.env
  (:require [clojure.tools.logging :as log]))

(def defaults
  {:init
   (fn []
     (log/info "\n-=[satellite-routes started successfully]=-"))
   :stop
   (fn []
     (log/info "\n-=[satellite-routes has shutdown successfully]=-"))
   :middleware identity})
