(function() {
  'use strict';

  angular
    .module('app')
    .directive('main', function() {
      return {
        restrict: 'E',
        templateUrl: 'app/components/main/main.html',
        controller: MainCtrl,
        controllerAs: 'mainVm',
        bindToController: true
      };
    });

  MainCtrl.$inject = ['$http', '$rootScope', '$mdDialog', '$state', '$q'];

  function MainCtrl($http, $rootScope, $mdDialog, $state, $q) {
    var vm = this;
      var deferred = $q.defer();

    vm.user = {};
    vm.id = "584e70e00ec505230753052e";
    vm.thing = { name : "thing", description : "description"};
    vm.isOpen             = false;
    vm.selectedDirection  = "down";
    vm.selectedMode       = "md-fling";
    vm.status = '';
    vm.$mdDialog          = $mdDialog;

    vm.getThings = function() {
      $http.get('/api/things')
        .then(function(response) {
          vm.thingsList = response.data;
        });
    };

    vm.postThing = function() {
      $http.post('/api/things', vm.thing)
        .then(function() {
          vm.status = 'OK';
        });
    };

      vm.showAlert = function(res) {
          alert = $mdDialog.alert({
              title: 'Attention',
              textContent: res,
              ok: 'Close'
          });

          $mdDialog
              .show( alert )
              .finally(function() {
                  alert = undefined;
              });
      };

    vm.getUser = function() {
        $http.post('/api/login',
            {username: ctrl.user.email, password: ctrl.user.password})
            // handle success
            .success(function (data, status) {
                if(status === 200 && data.status){
                    user = true;
                    vm.showAlert(data);
                    deferred.resolve();
                } else {
                    user = false;
                    vm.showAlert(data);
                    deferred.reject();
                }
            })
            // handle error
            .error(function (data) {
                user = false;
                vm.showAlert(data);
                deferred.reject();
            });

        // return promise object
        return deferred.promise;
    };

    vm.showRegistrationDialog = function(ev) {
        vm.$mdDialog.show({
            controller: UserRegistrationController
            , controllerAs: 'userRegCtrl'
            , templateUrl: 'app/components/controls/RegistrationSheet.html'
            , parent: angular.element(document.body)
            , targetEvent: ev
            , clickOutsideToClose: true
        });
    };
  }

  UserRegistrationController.$inject = ['$http', '$scope', '$rootScope', '$mdDialog', '$state', '$q']

  function UserRegistrationController($http, $scope, $rootScope, $mdDialog, $state, $q) {

      var deferred = $q.defer();
      var alert;
      var ctrl = this;

      ctrl.showConfirmPass = false;

      ctrl.user = {};

      ctrl.hide = function () {
          $mdDialog.hide();
      };

      ctrl.cancel = function () {
          $mdDialog.cancel();
      };

      ctrl.answer = function (answer) {
          $mdDialog.hide(answer);
      };

      ctrl.showConfirmPasswordInput = function() {
          $scope.showConfirmPass = true;
      };

      ctrl.showAlert = function(res) {
          alert = $mdDialog.alert({
              title: 'Attention',
              textContent: res,
              ok: 'Close'
          });

          $mdDialog
              .show( alert )
              .finally(function() {
                  alert = undefined;
              });
      };

      ctrl.postUser = function() {

        $http.post('/api/register', { user : ctrl.user})
            .success(function (data, status) {
                if(status === 200 && data.status){
                    ctrl.showAlert(data);
                    deferred.resolve();
                } else {
                    ctrl.showAlert(data);
                    deferred.reject();
                }
            })
            // handle error
            .error(function (data) {
                ctrl.showAlert(data);
                deferred.reject();
            });
      };
  }
})();
