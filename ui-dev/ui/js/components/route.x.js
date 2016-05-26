/******************************************************************************
Copyright (c) 2015, Intel Corporation

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Intel Corporation nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*****************************************************************************/
import {Router, Route, IndexRoute, useRouterHistory} from "react-router";
import {createHashHistory, useBeforeUnload} from "history";

import HOPE from "./hope.x";
import AppManager from "./app/app_manager.x";
import IDE from "./ide/ide.x";
import UIIDE from "./ui_ide/ui_ide.x";
import Composer from "./composer/composer.x";
import NotFound from "./not_found.x";
import Login from "./user/login.x";
import UserMgmt from "./user/user_mgmt.x";
import auth from "../lib/auth";

let history = useRouterHistory(useBeforeUnload(createHashHistory))({
  queryKey: false,
  getUserConfirmation: function (message, callback) {
    $hope.confirm(__("Leave without SAVE"), message, "warning", res => {
      if(!res) {
        $hope.app.stores.app.active_app(null);
      }
      callback(!res);
    }, {
      cancelButtonText: __("Leave"),
      confirmButtonText: __("Cancel and back to edit")
    });
  }
});

function requireAuth(nextState, replaceState) {
  if ($hope.ui_auth_required && !auth.is_logged_in()) {
    $hope.ui_redirect = nextState.location.pathname;
    replaceState({}, '/login');
  }
}

function redirectApp(nextState, replaceState) {
  if (!$hope.ui_auth_required) {
    replaceState({}, '/app');
  }
}

export default (
  <Router history={history} >
    <Route path="/" component={HOPE}>
      <IndexRoute component={$hope.ui_auth_required && !auth.is_logged_in() ? Login : AppManager}/>
      <Route path="login" component={Login} onEnter={redirectApp} />
      <Route path="users" component={UserMgmt} onEnter={requireAuth} />
      <Route path="app" component={AppManager} onEnter={requireAuth} />
      <Route path="ide/:id" component={IDE} onEnter={requireAuth} />
      <Route path="ui_ide/:id" component={UIIDE} onEnter={requireAuth} />
      <Route path="composer/:id" component={Composer} onEnter={requireAuth} />
      <Route path="*" component={NotFound}/>
    </Route>
  </Router>
);