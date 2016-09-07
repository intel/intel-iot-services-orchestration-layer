Debug
==================
##Introduction

The new feature debug allows developers to directly see what is happending in the workflow execution without stop it.

##Use

To use this function only need to click (whether under execution status or not) the service node you want to debug, then there is a circle icon appear on the node. And once you click the circle icon you can see a eye icon appear on the node, that shows the service under debug status. Then the result of workflow execution will show on the debug console of right sidebar.

##Example

How to make service under debug status:

![](./doc/pic/advanced/debug/debug1.gif){.viewer}

Use debug: take inject-random-range-Guage workflow as a example, this workflow's service configuration and exectution result has write under 'Get Started -> Advanced -> Use Service' category, so that not repeat at here. Only paste one gif animate: in this gif we can see result by Guage widgets pointer an number.

![](./doc/pic/advanced/use_service/IotSOL_NodeRED_workflow2.gif){.viewer}

Now we can see result without widgets, debug random or range service ,when execute,there are json data output to debug console. As the gif show , debug console print four json data :
 (1) random service's min and max value configuration.
   {
	 min: 0,
	 max: 100,
	 trigger: {
	 	_msgid: "64c7e349.2765cc",
	 	'topic': "",
	 	payload: 1470501985974
	}
   }  
 (2) random service's output: a number between min and max value.  
 {
 	out: 74.986482328429614
 }
 (3) range service's input: a munber from random service's output.
 {
 	in1: 74.986482328429614
 }
 (4) range service's output: translate input number to a number satisfy the configuration of range
 {
 	in1: 74.986482328429614
 }
Note : the output number may different from gif , because random service create random number.

![](./doc/pic/advanced/debug/debug2.gif){.viewer}