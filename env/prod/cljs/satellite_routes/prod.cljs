(ns satellite-routes.app
  (:require [satellite-routes.core :as core]))

;;ignore println statements in prod
(set! *print-fn* (fn [& _]))

(core/init!)
