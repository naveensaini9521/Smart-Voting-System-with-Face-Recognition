# election.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import logging
from bson import ObjectId
from functools import wraps
from flask_cors import cross_origin

# Import from your project structure
from smart_app.backend.mongo_models import Voter, Election, Vote, Candidate, AuditLog
from smart_app.backend.routes.dashboard import get_authenticated_voter, voter_required

logger = logging.getLogger(__name__)

# Create blueprint
election_bp = Blueprint('election', __name__)

# ============ ELECTION ROUTES ============

@election_bp.route('/elections', methods=['GET', 'OPTIONS'])
@cross_origin()
@voter_required
def get_elections_for_voter():
    """Get elections data for voter dashboard"""
    try:
        voter = request.voter
        election_type = request.args.get('type', 'all')
        status = request.args.get('status', 'all')
        
        elections_data = {
            'upcoming': get_upcoming_elections(voter, election_type),
            'active': get_active_elections(voter, election_type),
            'completed': get_past_elections(voter, election_type),
            'statistics': get_election_statistics(voter['voter_id']),
            'type_counts': get_election_type_counts()
        }
        
        return jsonify({
            'success': True,
            'elections_data': elections_data
        })
        
    except Exception as e:
        logger.error(f'Elections error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load elections data'
        }), 500

@election_bp.route('/elections/active', methods=['GET'])
@cross_origin()
@voter_required
def get_active_elections_enhanced():
    """Get active elections for voter dashboard - FIXED DATE HANDLING"""
    try:
        voter = request.voter
        logger.info(f"🔍 Loading active elections for voter: {voter['voter_id']}")
        
        current_time = datetime.utcnow()
        logger.info(f"⏰ Current time for election check: {current_time}")
        
        # Build query for active elections
        query = {
            "status": "active",
            "is_active": True,
            "voting_start": {"$lte": current_time},
            "voting_end": {"$gte": current_time}
        }
        
        logger.info(f"📋 Active elections query: {query}")
        
        # First, let's check if any elections exist at all
        all_elections_count = Election.count({"is_active": True})
        logger.info(f"📊 Total active elections in system: {all_elections_count}")
        
        if all_elections_count == 0:
            logger.warning("❌ No active elections found in database")
            return jsonify({
                'success': True,
                'elections': [],
                'total': 0,
                'current_time': current_time.isoformat(),
                'message': 'No elections available'
            })
        
        elections = Election.find_all(query, sort=[("voting_end", 1)])
        logger.info(f"✅ Found {len(elections)} active elections matching criteria")
        
        # If no elections found with the query, let's debug why
        if len(elections) == 0:
            logger.warning("⚠️ No elections matched the active criteria. Checking all elections...")
            
            # Get all active elections to see what's wrong
            all_active = Election.find_all({"is_active": True})
            for election in all_active:
                voting_start = election.get('voting_start')
                voting_end = election.get('voting_end')
                status = election.get('status')
                
                # Convert string dates to datetime objects if needed
                if isinstance(voting_start, str):
                    try:
                        voting_start = datetime.fromisoformat(voting_start.replace('Z', '+00:00'))
                    except:
                        voting_start = None
                
                if isinstance(voting_end, str):
                    try:
                        voting_end = datetime.fromisoformat(voting_end.replace('Z', '+00:00'))
                    except:
                        voting_end = None
                
                logger.info(f"📝 Election: {election.get('title')}")
                logger.info(f"   - Status: {status}")
                logger.info(f"   - Voting Start: {voting_start}")
                logger.info(f"   - Voting End: {voting_end}")
                logger.info(f"   - Current Time: {current_time}")
                
                if voting_start and voting_end:
                    try:
                        is_started = voting_start <= current_time
                        is_ended = voting_end < current_time
                        logger.info(f"   - Has started: {is_started}")
                        logger.info(f"   - Has ended: {is_ended}")
                    except TypeError as e:
                        logger.error(f"   - Date comparison error: {str(e)}")
                        logger.error(f"   - Voting start type: {type(voting_start)}")
                        logger.error(f"   - Voting end type: {type(voting_end)}")
                        logger.error(f"   - Current time type: {type(current_time)}")
        
        enhanced_elections = []
        for election in elections:
            try:
                # Safe date handling
                voting_start = election.get('voting_start')
                voting_end = election.get('voting_end')
                
                # Convert string dates to datetime if needed
                if isinstance(voting_start, str):
                    try:
                        voting_start = datetime.fromisoformat(voting_start.replace('Z', '+00:00'))
                    except:
                        voting_start = None
                
                if isinstance(voting_end, str):
                    try:
                        voting_end = datetime.fromisoformat(voting_end.replace('Z', '+00:00'))
                    except:
                        voting_end = None
                
                # Safe voting status check
                has_voted = False
                try:
                    has_voted = Vote.has_voted(election.get('election_id'), voter['voter_id'])
                except Exception as vote_error:
                    logger.warning(f"Could not check vote status: {str(vote_error)}")
                
                # Safe eligibility check
                is_eligible = False
                try:
                    is_eligible = check_voter_eligibility(voter['voter_id'], election.get('election_id'))
                except Exception as eligibility_error:
                    logger.warning(f"Could not check eligibility: {str(eligibility_error)}")
                
                # Safe candidates count
                candidates_count = 0
                try:
                    candidates_count = Candidate.count({
                        "election_id": election.get('election_id'),
                        "is_active": True,
                        "is_approved": True
                    })
                except Exception as candidate_error:
                    logger.warning(f"Could not count candidates: {str(candidate_error)}")
                
                # Safe vote count
                total_votes = 0
                try:
                    total_votes = Vote.count({"election_id": election.get('election_id')})
                except Exception as vote_count_error:
                    logger.warning(f"Could not count votes: {str(vote_count_error)}")
                
                election_data = {
                    'election_id': election.get('election_id'),
                    'title': election.get('title', 'Unknown Election'),
                    'description': election.get('description', ''),
                    'election_type': election.get('election_type', 'general'),
                    'status': election.get('status', 'active'),
                    'voting_start': voting_start.isoformat() if voting_start else None,
                    'voting_end': voting_end.isoformat() if voting_end else None,
                    'constituency': election.get('constituency', 'General Constituency'),
                    'has_voted': has_voted,
                    'is_eligible': is_eligible,
                    'can_vote': not has_voted and is_eligible,
                    'candidates_count': candidates_count,
                    'total_votes': total_votes,
                    'voter_turnout': election.get('voter_turnout', 0),
                    'election_logo': election.get('election_logo'),
                    'election_banner': election.get('election_banner'),
                    'require_face_verification': election.get('require_face_verification', True)
                }
                enhanced_elections.append(election_data)
                logger.info(f"Added election: {election.get('title')}")
                
            except Exception as election_error:
                logger.error(f"Error processing election {election.get('election_id')}: {str(election_error)}")
                continue
        
        logger.info(f"Successfully processed {len(enhanced_elections)} elections")
        
        return jsonify({
            'success': True,
            'elections': enhanced_elections,
            'total': len(enhanced_elections),
            'current_time': current_time.isoformat()
        })
        
    except Exception as e:
        logger.error(f"💥 Active elections error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to load active elections',
            'error': str(e),
            'elections': [],
            'total': 0
        }), 500


@election_bp.route('/elections/upcoming', methods=['GET'])
@cross_origin()
@voter_required
def get_upcoming_elections_enhanced():
    """Get upcoming elections for voter dashboard"""
    try:
        voter = request.voter
        
        query = {
            "status": "scheduled",
            "is_active": True,
            "voting_start": {"$gt": datetime.utcnow()}
        }
        
        elections = Election.find_all(query, sort=[("vouting_start", 1)])
        
        enhanced_elections = []
        for election in elections:
            is_eligible = check_voter_eligibility(voter['voter_id'], election.get('election_id'))
            
            enhanced_elections.append({
                'election_id': election.get('election_id'),
                'title': election.get('title', 'Unknown Election'),
                'description': election.get('description', ''),
                'election_type': election.get('election_type', 'general'),
                'status': election.get('status', 'scheduled'),
                'voting_start': election.get('voting_start').isoformat() if election.get('voting_start') else None,
                'voting_end': election.get('voting_end').isoformat() if election.get('voting_end') else None,
                'constituency': election.get('constituency', 'General Constituency'),
                'is_eligible': is_eligible,
                'candidates_count': Candidate.count({
                    "election_id": election.get('election_id'),
                    "is_active": True,
                    "is_approved": True
                }),
                'election_logo': election.get('election_logo')
            })
        
        return jsonify({
            'success': True,
            'elections': enhanced_elections,
            'total': len(enhanced_elections)
        })
        
    except Exception as e:
        logger.error(f"Upcoming elections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load upcoming elections'
        }), 500

@election_bp.route('/elections/completed', methods=['GET'])
@cross_origin()
@voter_required
def get_completed_elections():
    """Get completed elections for voter dashboard"""
    try:
        voter = request.voter
        
        query = {
            "status": "completed",
            "is_active": True,
            "voting_end": {"$lt": datetime.utcnow()}
        }
        
        elections = Election.find_all(query, sort=[("voting_end", -1)])
        
        enhanced_elections = []
        for election in elections:
            vote = Vote.find_by_election_and_voter(election.get('election_id'), voter['voter_id'])
            
            enhanced_elections.append({
                'election_id': election.get('election_id'),
                'title': election.get('title', 'Unknown Election'),
                'description': election.get('description', ''),
                'election_type': election.get('election_type', 'general'),
                'status': election.get('status', 'completed'),
                'voting_start': election.get('voting_start').isoformat() if election.get('voting_start') else None,
                'voting_end': election.get('voting_end').isoformat() if election.get('voting_end') else None,
                'constituency': election.get('constituency', 'General Constituency'),
                'voted': vote is not None,
                'vote_timestamp': vote.get('vote_timestamp').isoformat() if vote and vote.get('vote_timestamp') else None,
                'total_votes': Vote.count({"election_id": election.get('election_id')}),
                'results_available': election.get('results_publish') and datetime.utcnow() > election.get('results_publish', datetime.utcnow())
            })
        
        return jsonify({
            'success': True,
            'elections': enhanced_elections,
            'total': len(enhanced_elections)
        })
        
    except Exception as e:
        logger.error(f"Completed elections error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load completed elections'
        }), 500

@election_bp.route('/elections/<election_id>/candidates', methods=['GET'])
@cross_origin()
def get_election_candidates(election_id):
    """Get all candidates for a specific election"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        # Verify election exists and is active
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Check if election is active
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        if not (voting_start and voting_end):
            return jsonify({
                'success': False,
                'message': 'Invalid election configuration'
            }), 400

        if current_time < voting_start:
            return jsonify({
                'success': False,
                'message': 'Voting has not started yet'
            }), 400

        if current_time > voting_end:
            return jsonify({
                'success': False,
                'message': 'Voting has ended'
            }), 400

        if election.get('status') != 'active':
            return jsonify({
                'success': False,
                'message': 'Election is not currently active for voting'
            }), 400

        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election'
            }), 400

        # Get all approved candidates
        candidates = Candidate.find_all({
            "election_id": election_id,
            "is_active": True,
            "is_approved": True
        })

        candidates_data = []
        for candidate in candidates:
            candidate_data = {
                'candidate_id': candidate['candidate_id'],
                'full_name': candidate['full_name'],
                'party': candidate.get('party', 'Independent'),
                'party_symbol': candidate.get('party_symbol'),
                'photo': candidate.get('photo'),
                'biography': candidate.get('biography', ''),
                'manifesto': candidate.get('manifesto', ''),
                'qualifications': candidate.get('qualifications', ''),
                'agenda': candidate.get('agenda', ''),
                'candidate_number': candidate.get('candidate_number'),
                'symbol_name': candidate.get('symbol_name', ''),
                'assets_declaration': candidate.get('assets_declaration'),
                'criminal_records': candidate.get('criminal_records', 'none'),
                'is_approved': candidate.get('is_approved', False)
            }
            candidates_data.append(candidate_data)

        return jsonify({
            'success': True,
            'election': {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description', ''),
                'voting_end': election.get('voting_end'),
                'election_type': election.get('election_type', 'general'),
                'constituency': election.get('constituency', '')
            },
            'candidates': candidates_data,
            'total_candidates': len(candidates_data),
            'has_voted': Vote.has_voted(election_id, voter['voter_id'])
        })

    except Exception as e:
        logger.error(f"Election candidates error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load candidates'
        }), 500

# In your elections.py - Add session verification to cast_vote_in_election

@election_bp.route('/elections/<election_id>/vote', methods=['POST'])
@cross_origin()
def cast_vote_in_election(election_id):
    """Cast vote in an election - WITH SESSION VERIFICATION"""
    try:
        voter = get_authenticated_voter()
        if not voter:
            logger.error("No authenticated voter found for vote casting")
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        data = request.get_json()
        candidate_id = data.get('candidate_id')

        logger.info(f"Vote casting attempt - Election: {election_id}, Voter: {voter['voter_id']}, Candidate: {candidate_id}")

        if not candidate_id:
            logger.error("Candidate ID is missing from request")
            return jsonify({
                'success': False,
                'message': 'Candidate ID is required'
            }), 400

        # Verify election exists
        election = Election.find_by_election_id(election_id)
        if not election:
            logger.error(f"Election not found: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Enhanced election status checking
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        logger.info(f"⏰ Election time check - Current: {current_time}, Start: {voting_start}, End: {voting_end}")
        
        # Check if election is active
        if not (voting_start and voting_end):
            logger.error("Invalid election configuration - missing voting dates")
            return jsonify({
                'success': False,
                'message': 'Invalid election configuration'
            }), 400

        if current_time < voting_start:
            logger.warning(f"Voting not started yet - Election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Voting has not started yet'
            }), 400

        if current_time > voting_end:
            logger.warning(f"Voting ended - Election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Voting has ended'
            }), 400

        if election.get('status') != 'active':
            logger.warning(f"Election not active - Status: {election.get('status')}")
            return jsonify({
                'success': False,
                'message': 'Election is not currently active for voting'
            }), 400

        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            logger.warning(f"Voter already voted - Election: {election_id}, Voter: {voter['voter_id']}")
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election'
            }), 400

        # Enhanced voter eligibility check
        if not check_voter_eligibility(voter['voter_id'], election_id):
            logger.warning(f"Voter not eligible - Election: {election_id}, Voter: {voter['voter_id']}")
            return jsonify({
                'success': False,
                'message': 'You are not eligible to vote in this election'
            }), 400

        # Verify candidate exists and is approved
        candidate = Candidate.find_one({
            "candidate_id": candidate_id,
            "election_id": election_id,
            "is_active": True,
            "is_approved": True
        })
        if not candidate:
            logger.error(f"Invalid candidate: {candidate_id} for election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Invalid candidate or candidate not approved'
            }), 400

        logger.info(f"All checks passed. Creating vote record...")

        # Create vote record with enhanced data
        vote_data = {
            'vote_id': f"VOTE_{election_id}_{voter['voter_id']}_{int(datetime.utcnow().timestamp())}",
            'election_id': election_id,
            'voter_id': voter['voter_id'],
            'candidate_id': candidate_id,
            'face_verified': voter.get('face_verified', False),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'vote_timestamp': datetime.utcnow(),
            'is_verified': True,
            'location_data': {
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent')
            }
        }

        vote_id = Vote.create_vote(vote_data)
        logger.info(f"Vote recorded successfully: {vote_id}")

        # Update candidate vote count
        Candidate.get_collection().update_one(
            {"candidate_id": candidate_id},
            {"$inc": {"vote_count": 1}}
        )

        # Update election total votes
        Election.get_collection().update_one(
            {"election_id": election_id},
            {"$inc": {"total_votes": 1}}
        )

        # Log the vote
        AuditLog.create_log(
            action='vote_cast',
            user_id=voter['voter_id'],
            user_type='voter',
            details={
                'election_id': election_id,
                'election_title': election['title'],
                'candidate_id': candidate_id,
                'candidate_name': candidate['full_name'],
                'vote_id': vote_id,
                'party': candidate.get('party', 'Independent')
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )

        logger.info(f"🎉 Vote successfully cast - Vote ID: {vote_id}")

        return jsonify({
            'success': True,
            'message': 'Vote cast successfully!',
            'vote_id': vote_id,
            'candidate_name': candidate['full_name'],
            'candidate_party': candidate.get('party', 'Independent'),
            'election_title': election['title'],
            'vote_timestamp': datetime.utcnow().isoformat(),
            'confirmation_number': vote_id
        })

    except Exception as e:
        logger.error(f"Vote casting error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to cast vote. Please try again.'
        }), 500

@election_bp.route('/elections/<election_id>/start-voting', methods=['POST', 'OPTIONS'])
@cross_origin()
def start_voting_session(election_id):
    """Start a voting session for a voter"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        voter = get_authenticated_voter()
        if not voter:
            logger.warning("No authenticated voter for voting session")
            return jsonify({
                'success': False,
                'message': 'Authentication required'
            }), 401

        logger.info(f"Starting voting session for election: {election_id}, voter: {voter['voter_id']}")

        # Verify election exists
        election = Election.find_by_election_id(election_id)
        if not election:
            logger.error(f"Election not found: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Election not found'
            }), 404

        # Enhanced election status checking
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        logger.info(f"📊 Election time check - Current: {current_time}, Start: {voting_start}, End: {voting_end}")
        
        if not voting_start or not voting_end:
            logger.error("Invalid election configuration - missing voting dates")
            return jsonify({
                'success': False,
                'message': 'Invalid election configuration'
            }), 400

        # Check if voting has started
        if current_time < voting_start:
            time_remaining = voting_start - current_time
            hours_remaining = time_remaining.total_seconds() / 3600
            logger.warning(f"Voting not started yet - {hours_remaining:.1f} hours remaining")
            return jsonify({
                'success': False,
                'message': f'Voting starts in {hours_remaining:.1f} hours'
            }), 400

        # Check if voting has ended
        if current_time > voting_end:
            logger.warning(f"Voting ended - Election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'Voting has ended'
            }), 400

        if election.get('status') != 'active':
            logger.warning(f"Election not active - Status: {election.get('status')}")
            return jsonify({
                'success': False,
                'message': 'Election is not currently active for voting'
            }), 400

        # Check if voter has already voted
        if Vote.has_voted(election_id, voter['voter_id']):
            logger.warning(f"Voter already voted - Election: {election_id}, Voter: {voter['voter_id']}")
            return jsonify({
                'success': False,
                'message': 'You have already voted in this election',
                'has_voted': True
            }), 400

        # Check voter eligibility
        if not check_voter_eligibility(voter['voter_id'], election_id):
            logger.warning(f"Voter not eligible - Election: {election_id}, Voter: {voter['voter_id']}")
            return jsonify({
                'success': False,
                'message': 'You are not eligible to vote in this election'
            }), 400

        # Get approved candidates
        candidates = Candidate.find_all({
            "election_id": election_id,
            "is_active": True,
            "is_approved": True
        })

        if not candidates:
            logger.warning(f"No candidates found for election: {election_id}")
            return jsonify({
                'success': False,
                'message': 'No candidates available for this election'
            }), 400

        candidates_data = []
        for candidate in candidates:
            candidate_data = {
                'candidate_id': candidate['candidate_id'],
                'full_name': candidate['full_name'],
                'party': candidate.get('party', 'Independent'),
                'party_symbol': candidate.get('party_symbol'),
                'photo': candidate.get('photo'),
                'biography': candidate.get('biography', ''),
                'manifesto': candidate.get('manifesto', ''),
                'qualifications': candidate.get('qualifications', ''),
                'agenda': candidate.get('agenda', ''),
                'candidate_number': candidate.get('candidate_number'),
                'symbol_name': candidate.get('symbol_name', ''),
                'assets_declaration': candidate.get('assets_declaration'),
                'criminal_records': candidate.get('criminal_records', 'none')
            }
            candidates_data.append(candidate_data)

        # Create voting session
        session_id = f"VS_{election_id}_{voter['voter_id']}_{int(datetime.utcnow().timestamp())}"
        session_expires = datetime.utcnow() + timedelta(minutes=30)
        
        # Log the session start
        AuditLog.create_log(
            action='voting_session_started',
            user_id=voter['voter_id'],
            user_type='voter',
            details={
                'election_id': election_id,
                'election_title': election['title'],
                'session_id': session_id,
                'candidates_count': len(candidates_data)
            },
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        response_data = {
            'success': True,
            'message': 'Voting session started successfully',
            'session_id': session_id,
            'election': {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description', ''),
                'voting_start': election.get('voting_start').isoformat() if election.get('voting_start') else None,
                'voting_end': election.get('voting_end').isoformat() if election.get('voting_end') else None,
                'election_type': election.get('election_type', 'general'),
                'constituency': election.get('constituency', ''),
                'total_votes': Vote.count({"election_id": election_id}),
                'voter_turnout': election.get('voter_turnout', 0)
            },
            'candidates': candidates_data,
            'total_candidates': len(candidates_data),
            'session_expires': session_expires.isoformat(),
            'voting_instructions': [
                'Review all candidates before making your selection',
                'Your vote is final and cannot be changed once submitted',
                'Voting session will expire in 30 minutes',
                'Do not refresh the page during voting'
            ],
            'security_info': {
                'face_verification_required': election.get('require_face_verification', True),
                'secure_connection': True,
                'anonymous_voting': True
            }
        }

        logger.info(f"Voting session ready - Election: {election_id}, Session: {session_id}, Candidates: {len(candidates_data)}")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Voting session error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to start voting session. Please try again.',
            'error': str(e)
        }), 500

@election_bp.route('/elections/<election_id>/results', methods=['GET'])
@cross_origin()
@voter_required
def get_election_results_for_voter(election_id):
    """Get election results for voter"""
    try:
        voter = request.voter
        
        election = Election.find_by_election_id(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404

        # Check if results are available
        current_time = datetime.utcnow()
        voting_end = election.get('voting_end')
        results_publish = election.get('results_publish')
        
        # Allow viewing results if voting has ended or admin has published results
        if voting_end and current_time < voting_end and not election.get('results_published', False):
            return jsonify({
                'success': False,
                'message': 'Results will be available after voting ends'
            }), 400

        # Get results
        results = get_election_results_data(election_id)
        
        # Check if user voted
        has_voted = Vote.has_voted(election_id, voter['voter_id'])
        user_vote = None
        if has_voted:
            vote_record = Vote.find_by_election_and_voter(election_id, voter['voter_id'])
            if vote_record:
                candidate = Candidate.find_by_candidate_id(vote_record['candidate_id'])
                if candidate:
                    user_vote = {
                        'candidate_id': candidate['candidate_id'],
                        'candidate_name': candidate['full_name'],
                        'party': candidate.get('party', 'Independent')
                    }

        return jsonify({
            'success': True,
            'results': results,
            'election': {
                'election_id': election['election_id'],
                'title': election['title'],
                'description': election.get('description'),
                'election_type': election.get('election_type'),
                'constituency': election.get('constituency'),
                'voting_start': election.get('voting_start'),
                'voting_end': election.get('voting_end'),
                'total_voters': election.get('total_voters', 0),
                'voter_turnout': election.get('voter_turnout', 0),
                'results_published': election.get('results_published', False)
            },
            'has_voted': has_voted,
            'user_vote': user_vote,
            'results_available': True
        })

    except Exception as e:
        logger.error(f"Election results error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to load results'}), 500

def get_election_results_data(election_id):
    """Get comprehensive election results data"""
    try:
        # Get vote counts per candidate
        pipeline = [
            {"$match": {"election_id": election_id, "is_verified": True}},
            {"$group": {
                "_id": "$candidate_id",
                "total_votes": {"$sum": 1}
            }},
            {"$sort": {"total_votes": -1}}
        ]
        
        vote_results = list(Vote.get_collection().aggregate(pipeline))

        # Get candidate details
        candidates = Candidate.find_all({
            "election_id": election_id,
            "is_active": True
        })
        candidate_map = {cand['candidate_id']: cand for cand in candidates}

        results_data = []
        total_votes = 0
        
        for result in vote_results:
            candidate = candidate_map.get(result['_id'])
            if candidate:
                vote_count = result['total_votes']
                total_votes += vote_count
                results_data.append({
                    'candidate_id': candidate['candidate_id'],
                    'full_name': candidate['full_name'],
                    'party': candidate.get('party', 'Independent'),
                    'photo': candidate.get('photo'),
                    'party_symbol': candidate.get('party_symbol'),
                    'biography': candidate.get('biography', ''),
                    'manifesto': candidate.get('manifesto', ''),
                    'qualifications': candidate.get('qualifications', ''),
                    'candidate_number': candidate.get('candidate_number'),
                    'vote_count': vote_count,
                    'percentage': 0  # Will calculate below
                })

        # Calculate percentages
        for result in results_data:
            if total_votes > 0:
                result['percentage'] = round((result['vote_count'] / total_votes) * 100, 2)

        # Add candidates with zero votes
        for candidate_id, candidate in candidate_map.items():
            if candidate_id not in [r['candidate_id'] for r in results_data]:
                results_data.append({
                    'candidate_id': candidate['candidate_id'],
                    'full_name': candidate['full_name'],
                    'party': candidate.get('party', 'Independent'),
                    'photo': candidate.get('photo'),
                    'party_symbol': candidate.get('party_symbol'),
                    'biography': candidate.get('biography', ''),
                    'manifesto': candidate.get('manifesto', ''),
                    'qualifications': candidate.get('qualifications', ''),
                    'candidate_number': candidate.get('candidate_number'),
                    'vote_count': 0,
                    'percentage': 0
                })

        # Sort by vote count descending
        results_data.sort(key=lambda x: x['vote_count'], reverse=True)

        return {
            'candidates': results_data,
            'total_votes': total_votes,
            'calculated_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting election results data: {str(e)}")
        return {'candidates': [], 'total_votes': 0}

# ============ HELPER FUNCTIONS ============

def check_voter_eligibility(voter_id, election_id):
    """Check if voter is eligible to vote in election"""
    try:
        logger.info(f"Checking eligibility for voter {voter_id} in election {election_id}")
        
        voter = Voter.find_by_voter_id(voter_id)
        election = Election.find_by_election_id(election_id)
        
        if not voter:
            logger.error(f"Voter {voter_id} not found")
            return False
        
        if not election:
            logger.error(f"Election {election_id} not found")
            return False
        
        # Check if voter is active
        if not voter.get('is_active', False):
            logger.warning(f"Voter {voter_id} is not active")
            return False
        
        # Verify required identity verifications
        required_verifications = ['email_verified', 'phone_verified']
        missing_verifications = []
        
        for verification in required_verifications:
            if not voter.get(verification, False):
                missing_verifications.append(verification)
        
        if missing_verifications:
            logger.warning(f"Voter {voter_id} missing verifications: {missing_verifications}")
            return False
        
        # Check constituency matching
        voter_constituency = voter.get('constituency', 'General')
        election_constituency = election.get('constituency', 'General')
        
        logger.info(f"Constituency check - Voter: '{voter_constituency}', Election: '{election_constituency}'")
        
        # If election has 'General' constituency, allow all voters
        if election_constituency.lower() == 'general':
            logger.info(f"Election has general constituency, allowing all voters")
            constituency_match = True
        else:
            constituency_match = check_constituency_match(voter_constituency, election_constituency)
            
            if not constituency_match:
                logger.warning(f"Voter {voter_id} constituency mismatch: '{voter_constituency}' vs '{election_constituency}'")
                return False
        
        # Check if voting period is active
        current_time = datetime.utcnow()
        voting_start = election.get('voting_start')
        voting_end = election.get('voting_end')
        
        if voting_start and voting_end:
            if current_time < voting_start:
                logger.warning(f"Voting has not started yet: {voting_start} > {current_time}")
                return False
            if current_time > voting_end:
                logger.warning(f"Voting has ended: {voting_end} < {current_time}")
                return False
        else:
            logger.warning("Election missing voting dates")
            return False
        
        # Check if already voted
        if Vote.has_voted(election_id, voter_id):
            logger.warning(f"Voter {voter_id} already voted in this election")
            return False
        
        logger.info(f"Voter {voter_id} is ELIGIBLE for election {election_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error checking voter eligibility: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def check_constituency_match(voter_constituency, election_constituency):
    """Flexible constituency matching"""
    if not voter_constituency or not election_constituency:
        return True
    
    voter_constituency = str(voter_constituency).lower().strip()
    election_constituency = str(election_constituency).lower().strip()
    
    # Exact match
    if voter_constituency == election_constituency:
        return True
    
    # Contains match
    if voter_constituency in election_constituency or election_constituency in voter_constituency:
        return True
    
    return False

def get_upcoming_elections(voter, election_type='all'):
    """Get upcoming elections for voter"""
    try:
        query = {
            "voting_start": {"$gt": datetime.utcnow()},
            "status": "scheduled",
            "is_active": True
        }
        
        if election_type != 'all':
            query["election_type"] = election_type
        
        elections = Election.find_all(query, sort=[("voting_start", 1)])
        
        enhanced_elections = []
        for election in elections:
            enhanced_elections.append({
                'id': election.get('election_id', 'unknown'),
                'title': election.get('title', 'Unknown Election'),
                'type': election.get('election_type', 'general'),
                'date': election.get('voting_start', datetime.utcnow()).isoformat(),
                'registration_end': election.get('registration_end'),
                'constituency': election.get('constituency', 'General Constituency'),
                'description': election.get('description', ''),
                'status': 'upcoming',
                'can_register': datetime.utcnow() < election.get('registration_end', datetime.utcnow()),
                'is_eligible': check_voter_eligibility(voter['voter_id'], election.get('election_id', 'unknown'))
            })
        
        return enhanced_elections
    except Exception as e:
        logger.error(f"Error getting upcoming elections: {str(e)}")
        return []

def get_active_elections(voter, election_type='all'):
    """Get active elections for voter - FIXED VERSION with proper date handling"""
    try:
        current_time = datetime.utcnow()
        logger.info(f"🔍 Looking for active elections at: {current_time}")
        
        # Build query for active elections
        query = {
            "status": "active",
            "is_active": True
        }
        
        if election_type != 'all':
            query["election_type"] = election_type
        
        logger.info(f"Active elections query: {query}")
        
        # Get all elections with active status first
        elections = Election.find_all(query, sort=[("voting_end", 1)])
        logger.info(f"📊 Found {len(elections)} elections with active status")
        
        # Filter by date manually to ensure proper comparison
        active_elections = []
        for election in elections:
            voting_start = election.get('voting_start')
            voting_end = election.get('voting_end')
            
            # Convert string dates to datetime if needed
            if isinstance(voting_start, str):
                try:
                    voting_start = datetime.fromisoformat(voting_start.replace('Z', '+00:00'))
                except:
                    voting_start = None
            
            if isinstance(voting_end, str):
                try:
                    voting_end = datetime.fromisoformat(voting_end.replace('Z', '+00:00'))
                except:
                    voting_end = None
            
            # Skip if dates are missing
            if not voting_start or not voting_end:
                logger.warning(f"Election {election.get('election_id')} missing voting dates")
                continue
            
            # Check if current time is within voting period
            if voting_start <= current_time <= voting_end:
                active_elections.append(election)
                logger.info(f"ACTIVE: {election.get('title')} | Start: {voting_start} | End: {voting_end}")
            else:
                logger.info(f"INACTIVE: {election.get('title')} | Start: {voting_start} | End: {voting_end}")
        
        logger.info(f"Final active elections count: {len(active_elections)}")
        
        enhanced_elections = []
        for election in active_elections:
            has_voted = Vote.has_voted(election.get('election_id', 'unknown'), voter['voter_id'])
            is_eligible = check_voter_eligibility(voter['voter_id'], election.get('election_id', 'unknown'))
            
            enhanced_elections.append({
                'election_id': election.get('election_id', 'unknown'),
                'title': election.get('title', 'Unknown Election'),
                'type': election.get('election_type', 'general'),
                'date': election.get('voting_start', datetime.utcnow()).isoformat(),
                'end_date': election.get('voting_end', datetime.utcnow()).isoformat(),
                'constituency': election.get('constituency', 'General Constituency'),
                'description': election.get('description', ''),
                'status': 'active',
                'has_voted': has_voted,
                'can_vote': not has_voted and is_eligible,
                'is_eligible': is_eligible,
                'candidates_count': Candidate.count({"election_id": election.get('election_id', 'unknown')}),
                'voting_start': election.get('voting_start').isoformat() if election.get('voting_start') else None,
                'voting_end': election.get('voting_end').isoformat() if election.get('voting_end') else None,
                'total_votes': Vote.count({"election_id": election.get('election_id', 'unknown')}),
                'voter_turnout': election.get('voter_turnout', 0)
            })
        
        return enhanced_elections
        
    except Exception as e:
        logger.error(f"Error getting active elections: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []

def get_past_elections(voter, election_type='all'):
    """Get past elections for voter"""
    try:
        query = {
            "voting_end": {"$lt": datetime.utcnow()},
            "status": {"$in": ["completed", "cancelled"]},
            "is_active": True
        }
        
        if election_type != 'all':
            query["election_type"] = election_type
        
        elections = Election.find_all(query, sort=[("voting_end", -1)], limit=10)
        
        enhanced_elections = []
        for election in elections:
            vote = Vote.find_by_election_and_voter(election.get('election_id', 'unknown'), voter['voter_id'])
            enhanced_elections.append({
                'id': election.get('election_id', 'unknown'),
                'title': election.get('title', 'Unknown Election'),
                'type': election.get('election_type', 'general'),
                'date': election.get('voting_start', datetime.utcnow()).isoformat(),
                'constituency': election.get('constituency', 'General Constituency'),
                'status': election.get('status', 'completed'),
                'voted': vote is not None,
                'vote_timestamp': vote.get('vote_timestamp').isoformat() if vote and vote.get('vote_timestamp') else None,
                'results_available': election.get('results_publish') and datetime.utcnow() > election.get('results_publish', datetime.utcnow())
            })
        
        return enhanced_elections
    except Exception as e:
        logger.error(f"Error getting past elections: {str(e)}")
        return []

def get_election_statistics(voter_id):
    """Get election statistics"""
    try:
        return {
            'total_elections': Election.count({"is_active": True}),
            'upcoming_elections': get_upcoming_elections_count(),
            'active_elections': Election.count({
                "voting_start": {"$lte": datetime.utcnow()},
                "voting_end": {"$gte": datetime.utcnow()},
                "status": "active",
                "is_active": True
            }),
            'completed_elections': Election.count({
                "voting_end": {"$lt": datetime.utcnow()},
                "status": "completed",
                "is_active": True
            })
        }
    except Exception as e:
        logger.error(f"Error getting election statistics: {str(e)}")
        return {
            'total_elections': 0,
            'upcoming_elections': 0,
            'active_elections': 0,
            'completed_elections': 0
        }

def get_election_type_counts():
    """Get counts by election type"""
    try:
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {
                "_id": "$election_type",
                "count": {"$sum": 1}
            }}
        ]
        
        return list(Election.get_collection().aggregate(pipeline))
    except Exception as e:
        logger.error(f"Error getting election type counts: {str(e)}")
        return []

def get_upcoming_elections_count():
    """Get count of upcoming elections"""
    try:
        return Election.count({
            "voting_start": {"$gt": datetime.utcnow()},
            "status": "scheduled",
            "is_active": True
        })
    except Exception as e:
        logger.error(f"Error counting upcoming elections: {str(e)}")
        return 0
    
def normalize_date(date_value):
    """Normalize date value to datetime object"""
    if not date_value:
        return None
    
    if isinstance(date_value, datetime):
        return date_value
    
    if isinstance(date_value, dict) and '$date' in date_value:
        # MongoDB date format
        date_str = date_value['$date']
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            return None
    
    if isinstance(date_value, str):
        try:
            # Try ISO format
            return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
        except:
            try:
                # Try other common formats
                return datetime.strptime(date_value, "%Y-%m-%dT%H:%M:%S")
            except:
                try:
                    return datetime.strptime(date_value, "%Y-%m-%d %H:%M:%S")
                except:
                    return None
    
    return None