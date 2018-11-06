var multipartFile=(function(c,$){
	
	function init(type,mult,domId){
		console.log("init multipartFile plugin");
		
		var ui={
			uploadFileBox:{},
		};
		var file;
		var storeAs;
		var stsAccessKeyId = "",
			stsAccessKeySecret = "",
			stsToken = "";
		var oss;
		var client;
		var checkpoint_temp;
		var fileNum=0;
		var timer;
		var errTime=0;
		var uploadFileClient;
		var currentCheckpoint;
		
		function bindEvents(type,mult,domId){
			document.querySelector("#"+domId+" .FileUploadInput").onchange=function(){
				upload(mult,type,domId);
			}
			$("#"+domId+" .progress-box").on("tap",".cancelUploadFile",function(){
				plus.nativeUI.confirm( "确定要删除上传的文件吗?", function(e){
					console.log("Close confirm: "+e.index);
					if(e.index==0){
						delLogic(type,domId,mult);
						
						if(document.querySelector("#"+domId+" ."+type+"_target")) { //有视频
							
							var fileLi = document.querySelector("#"+domId+" ."+type+"_li");
							document.querySelector("#"+domId+" .publishFileList").removeChild(fileLi);
							document.querySelector("#"+domId+" .FileUploadInput").outerHTML= '<input type="file" name="FileUploadInput"  value="" class="input FileUploadInput" accept="'+type+'/*"/>';
							document.querySelector("#"+domId+" .FileUploadInput").onchange = function(){
								upload(mult,type,domId);
							}
						}
	
						plus.nativeUI.toast("已删除");
					}
				});
			})
			$("#"+domId+" .publishFileList").on("tap", ".icon-remove-"+type, function() {
				plus.nativeUI.confirm( "确定要删除上传的文件吗?", function(e){
					console.log("Close confirm: "+e.index);
					if(e.index==0){
						delLogic(type,domId,mult);
	
						if(document.querySelector("#"+domId+" ."+type+"_target")) { //有视频
							fileNum=0;
							var fileLi = document.querySelector("#"+domId+" ."+type+"_li");
							document.querySelector("#"+domId+" .publishFileList").removeChild(fileLi);
							document.querySelector("#"+domId+" .FileUploadInput").outerHTML='<input type="file" name="FileUploadInput"  value="" class="input FileUploadInput" accept="'+type+'/*"/>';
							document.querySelector("#"+domId+" .FileUploadInput").onchange = function(){
								upload(mult,type,domId);
							}
						}
	
						plus.nativeUI.toast("已删除");
					}
				});
			})
			
			$("#"+domId+" .progress-box").on("tap",".pauseUploadFile",function(){
					if(this.innerText=="暂停"){
	
						try{
							if (uploadFileClient) {
								uploadFileClient.cancel();
								if (uploadFileClient.isCancel()) {
									console.log("stop-upload!");
									this.innerText="续传";
									plus.nativeUI.toast("已暂停");
								} else {
									console.log(uploadFileClient.isCancel());
									plus.nativeUI.toast("暂停失败，请重试！")
								}
							}
						}catch (e) {
							console.error(e)
							this.innerText="续传";
						}
	//					listenline(false);
					}else if(this.innerText=="续传"){
						this.innerText="等待";
						if (uploadFileClient) {
							applyTokenDo(uploadFile,type,domId,false);
						} else {
							applyTokenDo(uploadFile,type,domId);
						}
					}else if(this.innerText=="成功"){
						plus.nativeUI.toast("文件已上传成功！");
					}
					else if(this.innerText=="等待"){
						console.error(this.innerText);
						plus.nativeUI.toast("请等待，正在连接。。");
					}else{
						console.error(this.innerText);
						plus.nativeUI.toast("异常，请删除重传");
					}
				})
			
			$("#"+domId+" .publishFileList").on('tap', 'li.'+type+'_li div', function() {
				console.log("dataset.target=="+this.dataset.target);
				if(type=="video"){
					var videoBox=document.createElement("div");
					document.body.appendChild(videoBox);
					videoBox.outerHTML='<div class="videoBox">\
						<span class="mui-btn mui-btn-red removeFile">关闭</span>\
						<video src="" controls="controls" autoplay class="video"></video>\
					</div>'
					var video=document.querySelector('.video');
					video.setAttribute('src',this.dataset.target);
				}else if(type=="audio"){
					var audioBox=document.createElement("div");
					document.body.appendChild(audioBox);
					audioBox.outerHTML='<div class="videoBox">\
						<span class="mui-btn mui-btn-red removeFile">关闭</span>\
						<audio src="" controls="controls" autoplay class="audio"></audio>\
					</div>'
					var audio=document.querySelector('.audio');
					audio.setAttribute('src',this.dataset.target);
				}
				document.querySelector('.removeFile').addEventListener('click',function(){
					document.body.removeChild(this.parentNode);
					this.nextElementSibling.setAttribute('src','');
				})
				
			})
			
			
			
		}
		
		function upload(mult,type,domId) {
			console.log("upload in"+mult)
			if(!mult){
				if(fileNum==0){
						file = document.querySelector("#"+domId+" .FileUploadInput").files[0];
						console.log(file);
	//					storeAs =time+"/test/"+32wei字符串加文件后缀;
						console.log("===file对象文件类型======"+file.name)
						if(file.name.indexOf(".")==-1){
							plus.nativeUI.alert("请选择正确的文件类型");
							return;
						}
						if(file["size"]>100*1024*1024){
							plus.nativeUI.alert("文件不能大于100M");
							return;
						}else if(file["size"]<1024){
							plus.nativeUI.alert("文件不能小于1k");
							return;
						}
						if (uploadFileClient) {
							applyTokenDo(uploadFile,type,domId);
						} else {
							applyTokenDo(uploadFile,type,domId);
						}
					}else{
						plus.nativeUI.toast("只能上传一个文件");
					}
			}
					
		};
		
		var applyTokenDo = function (func,type,domId, refreshSts) {
			var refresh = (typeof (refreshSts)!== "undefined")?refreshSts:true;
			if (refresh) {
				plus.storage.removeItem(domId.toUpperCase()+"FILENAME");
				window.dataUtil.getSTS(function(result){
					if(result.SystemCode==1){
						var ossObj={
							region :"oss-cn-hangzhou",
							accessKeyId: result.data.accessKeyId,
							accessKeySecret: result.data.accessKeySecret,
							stsToken: result.data.securityToken,
							bucket: "jsruiyin"
						};
						if(c.HOST_CONFIG=="http://47.102.23.142:8080/zhsxd/"){
							//生产环境
							ossObj={
								region :"oss-cn-shanghai",
								accessKeyId: result.data.accessKeyId,
								accessKeySecret: result.data.accessKeySecret,
								stsToken: result.data.securityToken,
								bucket: "zhsxd"
							};
						}
						client = new OSS(ossObj);
						return func(type,domId,client);
					}else{
						plus.nativeUI.toast("获取sts失败");
						document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "续传";
						return
					}
					
				},function(){
					plus.nativeUI.toast("请求sts失败");
					document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "续传";
					return
				})
			}
			return func(type,domId);
		};
		
		var uploadFile = function uploadFile(type,domId,client) {
			console.log("uploadfile 进入")
			if (!uploadFileClient || Object.keys(uploadFileClient).length === 0) {
				uploadFileClient = client;
			}
			$("#"+domId+" .progressFile").progressbar({progress:0}).show();
			document.querySelector("#"+domId+" .progress-box").style.display="block";
			document.querySelector("#"+domId+" .FileUploadInput").disabled=true;
			var file = document.querySelector("#"+domId+" .FileUploadInput").files[0];
			
			var key = plus.storage.getItem(domId.toUpperCase()+"FILENAME", key)
			console.log(key)
			if (!key || key ==""){
				var nowTime=window.methodUtil.getNowFormatDate();
				var	key="/"+nowTime+"/"+window.methodUtil.randomString() + file["name"].substring(file["name"].lastIndexOf("\."))
				plus.storage.setItem(domId.toUpperCase()+"FILENAME", key);
				console.log(key)
			}
			var _domId=domId;
			var progress=function progress(percent, cpt) {
			    console.log(_domId+"Progress: " + percent);
				$("#"+_domId+" .progressFile").progressbar().setProgress(percent * 100);
				currentCheckpoint = cpt;
				plus.storage.setItem(_domId.toUpperCase()+"CPTFILE", JSON.stringify(currentCheckpoint));
				plus.storage.setItem(_domId.toUpperCase()+"PERFILE", JSON.stringify(percent));
				var status_p = Math.floor(percent * 100);
				if(status_p>=100){
					status_p=99;
				}
				if(document.querySelector("#"+_domId+" .uploadStatusFile").innerHTML != "状态：上传成功"){
					document.querySelector("#"+_domId+" .pauseUploadFile").innerHTML = "暂停";
					document.querySelector("#"+_domId+" .uploadStatusFile").innerHTML = "状态：传输中"+status_p+"%";	
				}else{
					console.log("已经成功了")
					plus.storage.removeItem(_domId.toUpperCase()+"CPTFILE");
				}
			}
	
			var options = {
				progress:progress,
				partSize: 100 * 1024,
			};
			if (currentCheckpoint) {
				options.checkpoint = currentCheckpoint;
			}
			console.log("uploadFileClient"+uploadFileClient);
			return uploadFileClient.multipartUpload(key, file, options).then(function (res) {
				if(fileNum==0){
					fileNum=1;
					setTimeout(function(){
						console.log("requese before")
						window.dataUtil.checkFileSuccessOrNot(domId,key,function(xhr){
							console.log(xhr.getResponseHeader("Content-Length"))
							if(xhr.getResponseHeader("Content-Length")>1000){
								console.log("upload success: %j", res);
								document.querySelector("#"+domId+" .FileUploadInput").disabled=true;								
								console.log("cptinfo===="+plus.storage.getItem(domId.toUpperCase()+"CPTFILE"))
								plus.storage.removeItem(domId.toUpperCase()+"CPTFILE");
								function getObjectURL(file) { 
						            var url = null; 
						            if (window.createObjcectURL != undefined) { 
						                url = window.createOjcectURL(file); 
						            } else if (window.URL != undefined) { 
						                url = window.URL.createObjectURL(file); 
						            } else if (window.webkitURL != undefined) { 
						                url = window.webkitURL.createObjectURL(file); 
						            } 
						            return url; 
						        } 
						        console.log(file.path);
						        var objURL = getObjectURL(file);
						        
						        console.log(objURL);
								addWork.addOnePhoto("" + objURL, type,domId);
	//									currentCheckpoint = null;
	//									uploadFileClient = null;
								document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "状态：上传成功";
								document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "成功";
							}else{
								plus.nativeUI.toast("上传出现未知错误，请重新上传");
								
								document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "状态：异常请删除";
								document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "异常";
							}
							
						},function(xhr){
							console.log(xhr)
							plus.nativeUI.toast("上传出现未知错误，请重新上传");
							
							document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "状态：异常请删除";
							document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "异常";
						})
					},5000)
				}
				
				
				
			}).catch(function (err) {
				console.error(err.name);
				if (uploadFileClient && uploadFileClient.isCancel()) {
					console.log("stop-upload!");
					document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "状态：已暂停";
					document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "续传";
				} else {
	//						currentCheckpoint = null;
	//						uploadFileClient = null;
					if(err.name=="RequestError"){
						document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "状态：网络异常";
						document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "续传";
					}else{
						if(fileNum==0){
							if(err.name=="NoSuchUploadError"){
								console.error("catch在then之前执行了")
								document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "状态：NoSuchUploadError";
								document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "续传";
							}else{
								document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "续传";
							}
							
						}else if(fileNum==1){
							if(err.name=="NoSuchUploadError"){
								console.error("已执行then，仍然catch住了")
							}
							
						}
					}
				}
			});
		};
		
		function delLogic(type,domId,mult){
			//删除逻辑重新上传
			fileNum=0;
			if (uploadFileClient) {
				console.log("del 进入uploadfile")
				uploadFileClient.cancel();
				if (uploadFileClient.isCancel()) {
					console.log("del 置空")
					currentCheckpoint = null;
					uploadFileClient = null;
				} else {
					plus.nativeUI.toast("删除执行异常，请重试！")
					return
				}
			}
			console.log("没进")
			document.querySelector("#"+domId+" .pauseUploadFile").innerHTML = "暂停";
			document.querySelector("#"+domId+" .uploadStatusFile").innerHTML = "";
			document.querySelector("#"+domId+" .FileUploadInput").outerHTML='<input type="file" name="FileUploadInput"  value="" class="input FileUploadInput" accept="'+type+'/*"/>';
			document.querySelector("#"+domId+" .FileUploadInput").onchange = function(){
				upload(mult,type,domId);
			}
			$("#"+domId+" .progressFile").progressbar().setProgress(0);
			document.querySelector("#"+domId+" .FileUploadInput").disabled=false;
			document.querySelector("#"+domId+" .progress-box").style.display="none";
			plus.storage.removeItem(domId.toUpperCase()+"FILENAME");
			plus.storage.removeItem(domId.toUpperCase()+"CPTFILE");
		}
		
		function uiConstructor(type,domId){
			console.log(document.getElementById(domId));
			ui.uploadFileBox=document.getElementById(domId);
			ui.uploadFileBox.innerHTML='<div class="title">\
								添加'+(type=="video"?"视频":type=="audio"?"音频":"文件")+'\
							</div>\
							<ul  class="publish-circle-photo-list mui-clearfix publishFileList">\
								<li  class="x-button addCircleFileBtn">\
									<div class="publish-avar">\
										<img src="../../assets/images/squadron/upload-picture.png">\
										<input type="file" name="FileUploadInput" value="" class="input FileUploadInput" accept="'+((type=="video"||type=="audio")?type:"")+'/*"/>\
										</img >\
									</div>\
								</li>\
							</ul>\
							<div class="progress-box file" >\
								<div  class="mui-progressbar progressFile">\
									<span></span>\
								</div>\
								<div class="btn-box">\
									<span  class="uploadStatusFile"></span>\
									<a class="mui-btn mui-btn-mini mui-btn-red pauseUploadFile" >暂停</a>\
									<a class="mui-btn mui-btn-mini mui-btn-red cancelUploadFile">删除</a>\
								</div>\
							</div> ';
		}
		var mult=mult||false;
		if(type=="video"){
			console.log("type==video");
			uiConstructor(type,domId);
		}else if(type=="audio"){
			console.log("type==auido");
			uiConstructor(type,domId);
		}
		bindEvents(type,mult,domId);
		
	}
	return {
		init:init
	}
})(window,mui)
