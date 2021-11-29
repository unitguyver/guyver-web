node{

  stage('拉取代码') {
    checkout([
      $class: 'GitSCM', 
      branches: [[name: '*/main']], 
      extensions: [], 
      userRemoteConfigs: [[
        credentialsId: "b8b2c6c4-05d5-4779-ac56-abf571213c9d", 
        url: "https://github.com/unitguyver/guyver-web.git"
      ]]
    ])
  }

  stage('test'){
    sh 'echo test success!'
  }
}