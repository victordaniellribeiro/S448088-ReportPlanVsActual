Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',


    _release: undefined,
    _iterations: {},

    items:[
        {
            xtype:'container',
            itemId:'header',
            cls:'header'
        },
        {
            xtype:'container',
            itemId:'bodyContainer',
			height:'90%',
			width:'100%',
			autoScroll:true
        }
    ],


    launch: function() {
        //Write app code here

        //API Docs: https://help.rallydev.com/apps/2.1/doc/


        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];
        var projectId = project;   


        console.log('project ID:', projectId);


        var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox', {
			fieldLabel: 'Choose Release',
			width: 400,
			itemId: 'releaseComboBox',
			allowClear: true,
			showArrows: false,
			scope: this,
			listeners: {
				ready: function(combobox) {
					var release = combobox.getRecord();

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');
					this._release = combobox.getRecord();
					this._loadIterations(projectId);
				},
				select: function(combobox, records) {
					var release = records[0];

					//this._initDate = Rally.util.DateTime.toIsoString(release.get('ReleaseStartDate'),true);
					//this._endDate = Rally.util.DateTime.toIsoString(release.get('ReleaseDate'),true);
					this._releaseId = release.get('ObjectID');
					this._releaseName = combobox.getRecord().get('Name');
					this._release = combobox.getRecord();
					this._loadIterations(projectId);
				},
				scope: this
			}
		});

		this.myMask = new Ext.LoadMask({
            msg: 'Please wait...',
            target: this
        });

        this.down('#header').add([
        	releaseComboBox
		]);
    },


    _loadIterations: function(projectId) {
    	this.myMask.show();
    	this._iterations = {};


    	var release = this._release;
    	console.log('loading iterations:', projectId, this._release);

    	var iterationToStartDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'StartDate',
			value: release.get('ReleaseStartDate'),
			operator: '>='
		});

		var iterationToEndDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'StartDate',
			value: release.get('ReleaseDate'),
			operator: '<='
		});


		var iterationEndToStartDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'EndDate',
			value: release.get('ReleaseStartDate'),
			operator: '>='
		});

		var iterationEndToEndDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'EndDate',
			value: release.get('ReleaseDate'),
			operator: '<='
		});


		var filter = iterationToStartDateFilter.and(iterationEndToEndDateFilter);

		//filter = filter.or(iterationEndToStartDateFilter.and(iterationEndToEndDateFilter));

		var that = this;
    	var iterationsStore = Ext.create('Rally.data.wsapi.Store', {
			context: {
		        projectScopeUp: false,
		        projectScopeDown: true,
		        project: /project/+projectId //null to search all workspace
		    },
		    autoLoad: true,
			model: 'Iteration',
			fetch: ['Name', 'ObjectID', 'StartDate', 'EndDate', 'PlannedVelocity'],
			filters: filter,
			sorters: [{
				property: 'StartDate',
				direction: 'ASC'
			}],
			limit: Infinity,
			listeners: {
                load: function(store, data, success) {
                    // _.each(data, function(record) {
                    //     var estimateValue = record.get('Value');
                    //     estimates.add(record.get('ObjectID'), estimateValue);
                    // });
                    //console.log('data result:', data);

                    _.each(data, function(iteration) {
                    	//console.log('assembling interation:', iteration);

                    	var plannedVelocity = iteration.get('PlannedVelocity') || 0;

                        if (that._iterations[iteration.get('Name')]) {
                            plannedVelocity = plannedVelocity + that._iterations[iteration.get('Name')].PlannedVelocity;
                        }
                        that._iterations[iteration.get('Name')] = {
                            _ref:           iteration.get('_ref'),
                            Name:           iteration.get('Name'),
                            StartDate:      iteration.get('StartDate'),
                            EndDate:        iteration.get('EndDate'),
                            PlannedVelocity:      plannedVelocity,
                            PlanEstimate:   0,
                            ActualVelocity: 0,
                            ActualBurndown: 0,
                            PlannedBurndown:0,
                            IsFuture:       ""};

                    }, this);

                    that._iterations.Release = {
                        _ref:           "",
                        Name:           "Release",
                        StartDate:      "",
                        EndDate:        "",
                        Resources:      "",
                        PlanEstimate:   "",
                        ActualVelocity: "",
                        ActualBurndown: 0,
                        PlannedBurndown:0,
                        IsFuture:       ""};

                    //console.log('_iterations:', that._iterations);
                   
                    that._loadArtifacts(projectId);

                }
            }, scope: this
		});
    },

    _loadArtifacts: function(projectId) {
    	var release = this._release;
    	console.log('loading artifacts:', projectId, this._release);

    	var iterationToStartDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Iteration.StartDate',
			value: release.get('ReleaseStartDate'),
			operator: '>='
		});

		var iterationToEndDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Iteration.StartDate',
			value: release.get('ReleaseDate'),
			operator: '<='
		});


		var iterationEndToStartDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Iteration.EndDate',
			value: release.get('ReleaseStartDate'),
			operator: '>='
		});

		var iterationEndToEndDateFilter = Ext.create('Rally.data.QueryFilter', {
			property: 'Iteration.EndDate',
			value: release.get('ReleaseDate'),
			operator: '<='
		});


		var filter = iterationToStartDateFilter.and(iterationEndToEndDateFilter);

		//filter = filter.or(iterationEndToStartDateFilter.and(iterationEndToEndDateFilter));


		var that = this;


    	var artifactsStore = Ext.create('Rally.data.wsapi.artifact.Store', {
			context: {
		        projectScopeUp: false,
		        projectScopeDown: true,
		        project: /project/+projectId //null to search all workspace
		    },
		    autoLoad: true,
			models: ['Defect', 'HierarchicalRequirement', 'TestSet'],
			fetch: ['FormattedID', 'Name', 'ObjectID', 'Iteration', 'PlanEstimate', 'ScheduleState', 'Type'],
			filters: filter,
			limit: Infinity,
			listeners: {
                load: function(store, data, success) {
                    // _.each(data, function(record) {
                    //     var estimateValue = record.get('Value');
                    //     estimates.add(record.get('ObjectID'), estimateValue);
                    // });
                    //console.log('data result:', data);
                    var totalPlanEstimate = 0;

                    _.each(data, function(record) {
                    	totalPlanEstimate += record.get('PlanEstimate');
                    });

                    //console.log('PlanEstimate:', totalPlanEstimate);
                    that._aggregateData(data);

                }
            }, scope: this
		});

    },


    _aggregateData: function(data) {
    	var releasePlanEstimate = 0;
        var allStoriesDefectsDefectSuites = data;

        _.each(allStoriesDefectsDefectSuites, function(item) { //aggregate story, defect, & defect suite data
            var estimate = item.get('PlanEstimate') || 0;
            this._iterations[item.get('Iteration').Name].PlanEstimate += estimate;
            releasePlanEstimate += estimate;
            if (item.get('ScheduleState') === 'Accepted' || item.get('ScheduleState') === 'Ready to Ship') {
                this._iterations[item.get('Iteration').Name].ActualVelocity += estimate;
            }
        }, this);


        //console.log('aggregate: ', this._iterations);
        this._aggregateBurndown(releasePlanEstimate);

    },


    _aggregateBurndown: function(releasePlanEstimate) {
        var actualBurndown, plannedBurndown, future, lastPlannedVelocity, lastActualVelocity;
        var today = new Date();
        var i = 1;

        _.each(this._iterations, function(value) {
        	//console.log('value', value);
            /* The first row shows the first iteration of the release.
             And because what's shown on each row is the state of the
             release at the BEGINNING of that row's iteration, both
             the planned burndown and the actual burndown are set to
             the total release plan estimate. */
            if (i === 1) {
                actualBurndown = releasePlanEstimate;
                plannedBurndown = releasePlanEstimate;
                future = value.EndDate >= today;
            /* The final row shows the state of the release after the
             completion of the last iteration. */
            } else if (value.Name === "Release") {
                if (future) {
                    actualBurndown -= lastPlannedVelocity;
                    plannedBurndown -= lastPlannedVelocity;
                } else {
                    actualBurndown -= lastActualVelocity;
                    plannedBurndown -= lastPlannedVelocity;
                }
            /* if the PREVIOUS iteration has NOT been completed,
             use the -planned- velocity of that iteration
             to compute the point on the burndown where the
             CURRENT iteration would start */
            } else if (future) {
                actualBurndown -= lastPlannedVelocity;
                plannedBurndown -= lastPlannedVelocity;
                future = true;
            /* if the PREVIOUS iteration HAS been completed,
             use the -actual- velocity of that iteration
             to compute the point on the burndown where the
             CURRENT iteration would start */
            } else {         // past iteration
                actualBurndown -= lastActualVelocity;
                plannedBurndown -= lastPlannedVelocity;
                future = false;
            }
            future = value.EndDate >= today;
            lastPlannedVelocity = value.PlannedVelocity;
            lastActualVelocity = value.ActualVelocity;
            this._iterations[value.Name].ActualBurndown = actualBurndown;
            this._iterations[value.Name].PlannedBurndown = plannedBurndown;
            this._iterations[value.Name].IsFuture = future;
            i++;
        }, this);

        this._showTable(releasePlanEstimate);
    },

    _showTable: function(releasePlanEstimate) {
    	//console.log('iterations final:', this._iterations);

    	var data = [];

		_.each(this._iterations, function(value) {
			//console.log('item', value);

			data.push({
				Name: value.Name,
				StartDate: value.StartDate,
				EndDate: value.EndDate,
				PlannedVelocity: value.PlannedVelocity,
				PlanEstimate: value.PlanEstimate,
				ActualVelocity: value.ActualVelocity,
				ActualBurndown: value.ActualBurndown,
				PlannedBurndown: value.PlannedBurndown,
				IsFuture: value.IsFuture
			});
		}, this);

    	var featureStore = Ext.create('Ext.data.JsonStore', {
			fields: ['Name', 'StartDate', 'EndDate', 'PlannedVelocity', 'PlanEstimate', 'ActualVelocity', 'ActualBurndown', 'PlannedBurndown', 'IsFuture']
		});

		featureStore.loadData(data);

		//console.log('data:', data);

		var featuresGrid = Ext.create('Ext.grid.Panel', {
			width: 880,
			viewConfig: {
				stripeRows: true,
				enableTextSelection: true
			},
			store: featureStore,
			columns: [{
				text: 'Iteration Name',
				flex: 1,
				sortable: true,
				dataIndex: 'Name'
			}, {
				text: 'Start Date',
				flex: 1,
				format   : 'Y/m/d',
				xtype: 'datecolumn',
				sortable: true,
				dataIndex: 'StartDate'
			}, {
				text: 'End Date',
				flex: 1,
				format   : 'Y/m/d',
				xtype: 'datecolumn',
				sortable: true,
				dataIndex: 'EndDate'
			}, {
				text: 'Plan Estimate',
				flex: 1,
				sortable: true,
				dataIndex: 'PlanEstimate'
			}, {
				text: 'Actual Velocity',
				flex: 1,
				sortable: true,
				dataIndex: 'ActualVelocity'
			}, {
				text: 'Planned Velocity',
				flex: 1,
				sortable: true,
				dataIndex: 'PlannedVelocity'
			}, {
				text: 'Actual Burndown',
				flex: 1,
				sortable: true,
				dataIndex: 'ActualBurndown'
			}, {
				text: 'Planned Burndown',
				flex: 1,
				sortable: true,
				dataIndex: 'PlannedBurndown'
			}]
		});

		this.down('#bodyContainer').removeAll(true);
		this.down('#bodyContainer').add(featuresGrid);

		this.myMask.hide();
    }
});
